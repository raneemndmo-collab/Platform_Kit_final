import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KGNode, KGEdge, KGQuery } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(
    @InjectRepository(KGNode, 'm15_connection') private nodeRepo: Repository<KGNode>,
    @InjectRepository(KGEdge, 'm15_connection') private edgeRepo: Repository<KGEdge>,
    @InjectRepository(KGQuery, 'm15_connection') private queryRepo: Repository<KGQuery>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addNode(tenantId: string, data: { nodeType: string; label: string; sourceModule: string; sourceEntityId?: string; properties?: unknown }): Promise<KGNode> {
    const node = await this.nodeRepo.save(this.nodeRepo.create({ tenantId, ...data }));
    this.safeEmit('ai.kg.node.created', { tenantId, nodeId: node.id, nodeType: data.nodeType });
    return node;
  }

  async addEdge(tenantId: string, data: { sourceNodeId: string; targetNodeId: string; relationType: string; weight?: number }): Promise<KGEdge> {
    const edge = await this.edgeRepo.save(this.edgeRepo.create({ tenantId, ...data }));
    this.safeEmit('ai.kg.edge.created', { tenantId, edgeId: edge.id });
    return edge;
  }

  async getNode(tenantId: string, nodeId: string): Promise<KGNode> {
    return this.nodeRepo.findOneOrFail({ where: { id: nodeId, tenantId } });
  }

  async getNeighbors(tenantId: string, nodeId: string, depth: number = 1): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
    const edges = await this.edgeRepo.find({ where: [
      { tenantId, sourceNodeId: nodeId }, { tenantId, targetNodeId: nodeId },
    ]});
    const neighborIds = new Set(edges.flatMap(e => [e.sourceNodeId, e.targetNodeId]).filter(id => id !== nodeId));
    const nodes = neighborIds.size > 0 ? await this.nodeRepo.findByIds([...neighborIds]) : [];
    return { nodes, edges };
  }

  async findPath(tenantId: string, fromNodeId: string, toNodeId: string): Promise<KGQuery> {
    const startTime = Date.now();
    // BFS path finding (simplified)
    const visited = new Set<string>();
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromNodeId, path: [fromNodeId] }];
    let foundPath: string[] = [];

    while (queue.length > 0 && foundPath.length === 0) {
      const current = queue.shift()!;
      if (current.nodeId === toNodeId) { foundPath = current.path; break; }
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);
      const edges = await this.edgeRepo.find({ where: { tenantId, sourceNodeId: current.nodeId } });
      for (const edge of edges) {
        if (!visited.has(edge.targetNodeId)) {
          queue.push({ nodeId: edge.targetNodeId, path: [...current.path, edge.targetNodeId] });
        }
      }
    }

    return this.queryRepo.save(this.queryRepo.create({
      tenantId, queryText: `path:${fromNodeId}->${toNodeId}`, queryType: 'path_finding',
      result: { path: foundPath, found: foundPath.length > 0 }, latencyMs: Date.now() - startTime,
    }));
  }

  async searchNodes(tenantId: string, query: string, nodeType?: string): Promise<KGNode[]> {
    const qb = this.nodeRepo.createQueryBuilder('n').where('n.tenantId = :tenantId', { tenantId })
      .andWhere('(n.label ILIKE :q OR n.description ILIKE :q)', { q: `%${query}%` });
    if (nodeType) qb.andWhere('n.nodeType = :nodeType', { nodeType });
    return qb.take(20).getMany();
  }

  async getModuleSubgraph(tenantId: string, sourceModule: string): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
    const nodes = await this.nodeRepo.find({ where: { tenantId, sourceModule } });
    const nodeIds = nodes.map(n => n.id);
    const edges = nodeIds.length > 0 ? await this.edgeRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('(e.sourceNodeId IN (:...ids) OR e.targetNodeId IN (:...ids))', { ids: nodeIds })
      .getMany() : [];
    return { nodes, edges };
  }

  async getStats(tenantId: string): Promise<{ totalNodes: number; totalEdges: number; moduleBreakdown: unknown }> {
    const totalNodes = await this.nodeRepo.count({ where: { tenantId } });
    const totalEdges = await this.edgeRepo.count({ where: { tenantId } });
    return { totalNodes, totalEdges, moduleBreakdown: {} };
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.nodeRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
