import { Injectable } from '@angular/core';
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  Event as NostrEvent,
} from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';
import { RelayService } from './relay.service';
import { nip19 } from 'nostr-tools';

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

  async fetchUserMetadata(pubkey: string): Promise<any> {
    await this.ensureRelaysConnected();
    const pool = this.relayService.getPool();
    const connectedRelays = this.relayService.getConnectedRelays();

    return new Promise((resolve, reject) => {
      const sub = pool.subscribeMany(
        connectedRelays,
        [
          {
            authors: [pubkey],
            kinds: [0],
          },
        ],
        {
          onevent(event: NostrEvent) {
            if (event.pubkey === pubkey && event.kind === 0) {
              try {
                const content = JSON.parse(event.content);
                resolve(content);
              } catch (error) {
                console.error('Error parsing event content:', error);
                resolve(null);
              }
              sub.close();
            }
          },
          oneose() {
            sub.close();
            resolve(null);
          },
        }
      );
    });
  }

  async fetchEvents(pubkey: string): Promise<NostrEvent[]> {
    await this.ensureRelaysConnected();
    const pool = this.relayService.getPool();
    const connectedRelays = this.relayService.getConnectedRelays();

    return new Promise((resolve, reject) => {
      const events: NostrEvent[] = [];
      const sub = pool.subscribeMany(
        connectedRelays,
        [
          {
            authors: [pubkey],
            kinds: [1], // Assuming kind 1 for normal text events
          },
        ],
        {
          onevent(event: NostrEvent) {
            events.push(event);
          },
          oneose() {
            sub.close();
            resolve(events);
          },
        }
      );
    });
  }

  convertBech32ToHex(pubkey: string): any {
    try {
      const { data } = nip19.decode(pubkey);
      pubkey = data as string;
      return pubkey;
    } catch (error) {
      console.error('Invalid bech32 format:', error);
      return pubkey; // Return as is if not valid bech32
    }
  }
}
