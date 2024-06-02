import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EventListComponent } from './event-list/event-list.component';
import { UserListComponent } from './user-list/user-list.component';
import { RelayService } from './relay.service';
import { NostrService } from './nostr.service';

@NgModule({
  declarations: [
    AppComponent,
    EventListComponent,
    UserListComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [RelayService, NostrService],
  bootstrap: [AppComponent]
})
export class AppModule { }
