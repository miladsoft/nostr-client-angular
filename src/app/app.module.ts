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
