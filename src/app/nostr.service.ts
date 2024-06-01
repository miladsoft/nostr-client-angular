import { Injectable } from '@angular/core';
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  Event as NostrEvent,
} from 'nostr-tools/pure'; // Ensure correct path
import { bytesToHex } from '@noble/hashes/utils';
import { RelayService } from './relay.service';
   import { Filter } from 'nostr-tools';

@Injectable({
  providedIn: 'root',
})
export class NostrService {
  private secretKey: Uint8Array;
  private publicKey: string;

  constructor(public relayService: RelayService) {
    this.secretKey = generateSecretKey();
    this.publicKey = getPublicKey(this.secretKey);
  }

  generateNewAccount(): { publicKey: string; secretKeyHex: string } {
    this.secretKey = generateSecretKey();
    this.publicKey = getPublicKey(this.secretKey);
    return {
      publicKey: this.publicKey,
      secretKeyHex: bytesToHex(this.secretKey),
    };
  }

  getKeys(): { secretKey: Uint8Array; publicKey: string } {
    return {
      secretKey: this.secretKey,
      publicKey: this.publicKey,
    };
  }

  getSecretKeyHex(): string {
    return bytesToHex(this.secretKey);
  }

  getPublicKeyHex(): string {
    return this.publicKey;
  }

  createEvent(content: string): NostrEvent {
    const eventTemplate = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content,
      pubkey: this.publicKey,
      id: '',
      sig: ''
    };
    const event = finalizeEvent(eventTemplate, this.secretKey);
    return event;
  }

  async publishEvent(content: string): Promise<void> {
    const event = this.createEvent(content);
    const pool = this.relayService.getPool();
    const connectedRelays = this.relayService.getConnectedRelays();
    await Promise.all(pool.publish(connectedRelays, event));
  }

  async ensureRelaysConnected(): Promise<void> {
    await this.relayService.ensureConnectedRelays();
  }

  subscribeToEvents(callback: (event: NostrEvent) => void): void {
    this.ensureRelaysConnected().then(() => {
      const pool = this.relayService.getPool();
      const connectedRelays = this.relayService.getConnectedRelays();
      pool.subscribeMany(
        connectedRelays,
        [
          {
            kinds: [1],
          },
        ],
        {
          onevent: (event: NostrEvent) => {
            callback(event);
          },
        }
      );
    });
  }
}
