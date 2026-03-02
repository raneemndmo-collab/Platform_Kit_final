// Rasid v6.4 — Collaboration Hub Service — M23
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CollabChannel { id: string; name: string; type: 'project' | 'module' | 'team' | 'general'; members: string[]; }
export interface CollabMessage { id: string; channelId: string; authorId: string; content: string; attachments: string[]; reactions: Record<string, string[]>; threadId?: string; }

@Injectable()
export class CollaborationService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    @InjectRepository(require('../../domain/entities/collaboration.entity').CollaborationEntity, 'collaboration_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  async createChannel(tenantId: string, dto: { name: string; type: CollabChannel['type']; members: string[] }) {
    const entity = this.repo.create({ tenantId, name: dto.name, type: dto.type, members: dto.members, messages: [], settings: { archived: false, pinned: [] }, metadata: {} });
    const saved = await this.repo.save(entity);
    this.safeEmit('m23_collab.channel_created', { tenantId, channelId: saved.id, type: dto.type, memberCount: dto.members.length });
    return saved;
  }

  async postMessage(channelId: string, tenantId: string, message: Omit<CollabMessage, 'id'>) {
    const channel = await this.repo.findOne({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException();
    const msg: CollabMessage = { id: `msg_${Date.now()}`, ...message, reactions: {} };
    channel.messages = [...(channel.messages || []), msg];
    const saved = await this.repo.save(channel);
    this.safeEmit('m23_collab.message_posted', { tenantId, channelId, authorId: message.authorId, hasAttachments: (message.attachments?.length || 0) > 0 });
    return msg;
  }

  async addReaction(channelId: string, tenantId: string, messageId: string, userId: string, emoji: string) {
    const channel = await this.repo.findOne({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException();
    channel.messages = (channel.messages || []).map((m: CollabMessage) => {
      if (m.id === messageId) {
        const reactions = { ...m.reactions };
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes(userId)) reactions[emoji].push(userId);
        return { ...m, reactions };
      }
      return m;
    });
    return this.repo.save(channel);
  }

  async addMember(channelId: string, tenantId: string, userId: string) {
    const channel = await this.repo.findOne({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException();
    if (!channel.members.includes(userId)) { channel.members.push(userId); await this.repo.save(channel); }
    this.safeEmit('m23_collab.member_added', { tenantId, channelId, userId });
    return channel;
  }

  async searchMessages(tenantId: string, query: string, limit: number = 20): Promise<CollabMessage[]> {
    const channels = await this.repo.find({ where: { tenantId } });
    const results: CollabMessage[] = [];
    for (const ch of channels) {
      for (const msg of (ch.messages || [])) {
        if (msg.content?.toLowerCase().includes(query.toLowerCase())) results.push(msg);
        if (results.length >= limit) return results;
      }
    }
    return results;
  }

  async pinMessage(channelId: string, tenantId: string, messageId: string) {
    const channel = await this.repo.findOne({ where: { id: channelId, tenantId } });
    if (!channel) throw new NotFoundException();
    channel.settings = { ...channel.settings, pinned: [...(channel.settings?.pinned || []), messageId] };
    return this.repo.save(channel);
  }

  async findByTenant(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } }); }
  async findOne(id: string, tenantId: string) { return this.repo.findOne({ where: { id, tenantId } }); }
}
