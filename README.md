## Project Description: NOSTR Client using Angular 18 and nostr-tools npm Library

This project aims to create a simple NOSTR (Notes and Other Stuff Transmitted by Relays) client using Angular 18 and the nostr-tools npm library. The goal of this project is to demonstrate how to utilize the nostr-tools library to connect to NOSTR relays, receive messages, and display them in an Angular application.

### What is NOSTR?
NOSTR is a protocol for creating decentralized and encrypted communication applications. It uses relays to transmit messages and ensure privacy and security. The nostr-tools library provides a set of tools to interact with NOSTR relays, manage keys, and handle events.

### Project Structure
The project will consist of the following components:
1. **RelayService**: A service to manage connections to NOSTR relays and handle the reception of messages.
2. **MessagesComponent**: A component to display messages received from the NOSTR relays.
3. **AppComponent**: The root component of the Angular application.

### Steps to Build the Project

#### Step 1: Create a New Angular Project

First, create a new Angular project:

```bash
ng new nostr-messages-app --no-standalone
cd nostr-messages-app
```

#### Step 2: Install Required Packages

Install Angular Material and the nostr-tools library:

```bash
ng add @angular/material
npm install nostr-tools isomorphic-ws
```

#### Step 3: Create the RelayService

Generate a service to manage connections to NOSTR relays:

```bash
ng generate service relay
```

In the `src/app/relay.service.ts` file, add the following code:

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
    this.connectToRelays();
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

#### Step 4: Create the MessagesComponent

Generate a component to display messages:

```bash
ng generate component messages
```

In the `src/app/messages/messages.component.ts` file, add the following code:

```typescript
import { Component, OnInit } from '@angular/core';
import { RelayService } from '../relay.service';
import { Observable } from 'rxjs';
import { Event } from 'nostr-tools';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit {
  messages$: Observable<Event[]>;

  constructor(private relayService: RelayService) {
    this.messages$ = this.relayService.messages$;
  }

  ngOnInit(): void {
    this.relayService.connectToRelays();
  }
}
```

#### Step 5: Create the MessagesComponent Template

In the `src/app/messages/messages.component.html` file, add the following code:

```html
<div *ngFor="let message of messages$ | async">
  <mat-card>
    <mat-card-content>
      <p>{{ message.content }}</p>
    </mat-card-content>
  </mat-card>
</div>
```

#### Step 6: Update AppComponent and Template

If not already present, create the `app.component.ts` and `app.component.html` files.

**app.component.ts:**

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'nostr-messages-app';
}
```

**app.component.html:**

```html
<app-messages></app-messages>
```

**app.component.css:** (You can leave this file empty or add your own styles)

```css
/* Add your styles here */
```

#### Step 7: Create AppModule

In the `src/app/app.module.ts` file, add the following code:

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';

import { AppComponent } from './app.component';
import { MessagesComponent } from './messages/messages.component';
import { RelayService } from './relay.service';

@NgModule({
  declarations: [
    AppComponent,
    MessagesComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatCardModule
  ],
  providers: [RelayService],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

#### Step 8: Configure main.ts

Ensure that the `src/main.ts` file looks like this:

```typescript
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

#### Step 9: Run the Application

Run the following command to start the application:

```bash
ng serve
```

Then, navigate to `http://localhost:4200` in your browser to see the application running and displaying messages from the NOSTR relays.

### Conclusion

By following these steps, you have created an Angular 18 application that uses the nostr-tools library to connect to NOSTR relays and display messages. This project serves as a comprehensive guide to using nostr-tools with Angular, demonstrating the key concepts and steps required to build a functional NOSTR client.
