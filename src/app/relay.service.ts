import { Injectable } from '@angular/core';
import { SimplePool } from 'nostr-tools';
import WebSocket from 'isomorphic-ws';

@Injectable({
  providedIn: 'root'
})
export class RelayService {
  private pool: SimplePool;
  public relays: { url: string, connected: boolean }[];
  private isConnected: boolean = false;
  private retryInterval: number = 5000; // 5 seconds

  constructor() {
    this.pool = new SimplePool();
    this.relays = this.loadRelaysFromLocalStorage();
  }

  private loadRelaysFromLocalStorage(): { url: string, connected: boolean }[] {
    const defaultRelays = [
      { url: "wss://relay.angor.io", connected: false },
      { url: "wss://relay2.angor.io", connected: false },
      { url: "wss://relay.damus.io",connected: false },
      { url: "wss://nostr.mom",connected: false },
      { url: "wss://nostr.slothy.win",connected: false },
      { url: "wss://relay.stoner.com",connected: false },
      // { url:"wss://nostr.einundzwanzig.space",connected: false },
      // { url:"wss://nos.lol",connected: false },
      // { url:"wss://relay.nostr.band",connected: false },
      // { url:"wss://relay.oldcity-bitcoiners.info",connected: false },
      // { url:"wss://nostr.massmux.com",connected: false },
      // { url:"wss://nostr-relay.schnitzel.world",connected: false },
      // { url: "wss://relay.nostr.com.au",connected: false },
      // { url: "wss://knostr.neutrine.com",connected: false },
      // { url: "wss://nostr.nodeofsven.com",connected: false },
      // { url: "wss://nostr.vulpem.com",connected: false },
      // { url:"wss://relay.farscapian.com",connected: false },
      // { url: "wss://relay.sovereign-stack.org",connected: false },
      // { url: "wss://relay.lexingtonbitcoin.org",connected: false },
      // { url: "wss://relay.plebstr.com",connected: false },
      // { url:"wss://relay-pub.deschooling.us",connected: false }
    ];
    if (typeof localStorage !== 'undefined') {
      const storedRelays = JSON.parse(localStorage.getItem('nostrRelays') || '[]');
      return [...defaultRelays, ...storedRelays];
    }
    return defaultRelays;
  }

  public saveRelaysToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      const customRelays = this.relays.filter(relay => !['wss://relay.angor.io', 'wss://relay2.angor.io','wss://relay.damus.io','wss://nostr.mom','wss://nostr.slothy.win','wss://relay.stoner.com'].includes(relay.url));
      localStorage.setItem('nostrRelays', JSON.stringify(customRelays));
    }
  }

  private async connectToRelay(relay: { url: string; connected: boolean }): Promise<void> {
    try {
      const ws = new WebSocket(relay.url);
      ws.onopen = () => {
        relay.connected = true;
        console.log(`Connected to relay: ${relay.url}`);
        this.saveRelaysToLocalStorage();
      };
      ws.onerror = (error) => {
        relay.connected = false;
        console.error(`Failed to connect to relay: ${relay.url}`, error);
        this.saveRelaysToLocalStorage();
      };
      ws.onclose = () => {
        relay.connected = false;
        console.log(`Disconnected from relay: ${relay.url}`);
        setTimeout(() => this.connectToRelay(relay), this.retryInterval); // Retry connection after interval
        this.saveRelaysToLocalStorage();
      };
    } catch (error) {
      relay.connected = false;
      console.error(`Failed to connect to relay: ${relay.url}`, error);
      setTimeout(() => this.connectToRelay(relay), this.retryInterval); // Retry connection after interval
      this.saveRelaysToLocalStorage();
    }
  }

  public async connectToRelays(): Promise<void> {
    if (this.isConnected) return;

    const connections = this.relays.map(relay => this.connectToRelay(relay));
    await Promise.all(connections);
    this.isConnected = true;
  }

  public getPool(): SimplePool {
    return this.pool;
  }

  public getConnectedRelays(): string[] {
    return this.relays.filter(relay => relay.connected).map(relay => relay.url);
  }

  public addRelay(url: string): void {
    if (!this.relays.some((relay) => relay.url === url)) {
      this.relays.push({ url, connected: false });
      this.connectToRelay({ url, connected: false });
    }
  }

  public async ensureConnectedRelays(): Promise<void> {
    await this.connectToRelays();
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.getConnectedRelays().length > 0) {
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
    });
  }
}
