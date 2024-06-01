# Project Description: NOSTR Client using Angular and nostr-tools npm Library

This project aims to create a simple NOSTR (Notes and Other Stuff Transmitted by Relays) client using Angular and the nostr-tools npm library. The goal of this project is to demonstrate how to utilize the nostr-tools library to connect to NOSTR relays, receive messages, and display them in an Angular application.

## What is NOSTR?

NOSTR is a protocol for creating decentralized and encrypted communication applications. It uses relays to transmit messages and ensure privacy and security. The nostr-tools library provides a set of tools to interact with NOSTR relays, manage keys, and handle events.

## Project Structure

```
nostr-client/
├── src/
│   ├── app/
│   │   ├── event-list/
│   │   │   ├── event-list.component.html
│   │   │   ├── event-list.component.css
│   │   │   ├── event-list.component.ts
│   │   ├── relay.service.ts
│   │   ├── nostr.service.ts
│   │   ├── app.component.html
│   │   ├── app.component.ts
│   │   ├── app.module.ts
├── package.json
├── angular.json
└── README.md
```

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/miladsoft/nostr-client-angular.git
   cd nostr-client-angular
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the Angular development server:
   ```sh
   ng serve
   ```

## Usage

Open your browser and navigate to `http://localhost:4200` to see the application in action. You will be able to create new users, send messages, and see messages received from NOSTR relays.

## Code Overview

### `NostrService`

This service manages the creation of NOSTR events, publishing events to relays, and subscribing to events from relays.

```typescript
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
```

### `RelayService`

This service manages the connection to NOSTR relays, ensuring they are connected and handling reconnection if necessary.

```typescript
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
      { url: 'wss://relay.angor.io', connected: false },
      { url: 'wss://relay2.angor.io', connected: false }
    ];
    if (typeof localStorage !== 'undefined') {
      const storedRelays = JSON.parse(localStorage.getItem('nostrRelays') || '[]');
      return [...defaultRelays, ...storedRelays];
    }
    return defaultRelays;
  }

  public saveRelaysToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      const customRelays = this.relays.filter(relay => !['wss://relay.angor.io', 'wss://relay2.angor.io'].includes(relay.url));
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
      this.connectToRelay({ url, connected: false }); // Attempt to connect to the new relay
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
```

### `EventListComponent`

This component handles the display of events, allowing users to create new messages and displaying messages received from NOSTR relays.

```typescript
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { NostrService } from '../nostr.service';
import { NostrEvent } from 'nostr-tools';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {
  public events: NostrEvent[] = [];
  public newEventContent: string = '';
  private publicKey: string;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(private nostrService: NostrService) {
    this.publicKey = this.nostrService.getPublicKeyHex();
  }

  ng

OnInit(): void {
    this.nostrService.subscribeToEvents((event: NostrEvent) => {
      this.events.push(event);
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  createUser() {
    const account = this.nostrService.generateNewAccount();
    this.publicKey = account.publicKey;
    console.log(`New user created: ${account.publicKey}`);
  }

  async addEvent() {
    if (this.newEventContent.trim() !== '') {
      await this.nostrService.publishEvent(this.newEventContent);
      this.newEventContent = '';
    }
  }

  isMyMessage(event: NostrEvent): boolean {
    return event.pubkey === this.publicKey;
  }

  parseContent(content: string): string {
    // Enhanced parser for images, videos, links, and more
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, (url) => {
      if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
        return `<img src="${url}" alt="Image" width="100%" style="max-width: 100%; border-radius: 5px;">`;
      } else if (url.match(/\.(mp4|webm)$/) != null) {
        return `<video controls width="100%" style="max-width: 100%; border-radius: 5px;"><source src="${url}" type="video/mp4">Your browser does not support the video tag.</video>`;
      } else if (url.match(/(youtu\.be\/|youtube\.com\/watch\?v=)/)) {
        let videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
        const ampersandPosition = videoId.indexOf('&');
        if (ampersandPosition !== -1) {
          videoId = videoId.substring(0, ampersandPosition);
        }
        return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        return `<a href="${url}" target="_blank" style="color: #007bff;">${url}</a>`;
      }
    }).replace(/\n/g, '<br>');
  }
}
```

### HTML Template

```html
<div class="chat-container">
  <div class="header">
    <button (click)="createUser()">Create New User</button>
  </div>

  <div class="messages" #messagesContainer>
    <div *ngFor="let event of events" class="message" [ngClass]="{'my-message': isMyMessage(event), 'other-message': !isMyMessage(event)}">
      <div [innerHTML]="parseContent(event.content)"></div>
    </div>
  </div>

  <div class="footer">
    <textarea [(ngModel)]="newEventContent" placeholder="Type a message..."></textarea>
    <button (click)="addEvent()">Send</button>
  </div>
</div>
```

### CSS Styling

```css
body, html {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
}

.message {
  max-width: 50%;
  width: 700px;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f1f1f1;
  border-radius: 10px;
  word-wrap: break-word;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.my-message {
  margin-left: auto;
  background-color: #d1e7dd;
  border-top-right-radius: 0;
}

.other-message {
  margin-right: auto;
  background-color: #f8d7da;
  border-top-left-radius: 0;
}

.footer {
  display: flex;
  padding: 10px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
}

textarea {
  flex: 1;
  resize: none;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 10px;
  margin-right: 10px;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: background-color 0.3s;
}

button:hover {
  background-color: #0056b3;
}

img, video, iframe {
  max-width: 100%;
  max-height: 300px;  
  display: block;
  margin: 10px 0;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
```

### App Module

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { EventListComponent } from './event-list/event-list.component';
import { RelayService } from './relay.service';
import { NostrService } from './nostr.service';

@NgModule({
  declarations: [
    AppComponent,
    EventListComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [RelayService, NostrService],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### Running the Project

To run the project, use the following commands:

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200` to see the application in action. You will be able to create new users, send messages, and see messages received from NOSTR relays.

This project demonstrates how to use the nostr-tools library with Angular to create a simple yet powerful NOSTR client. Feel free to explore and enhance the functionalities as needed.