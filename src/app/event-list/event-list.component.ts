import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NostrService } from '../nostr.service';
import { NostrEvent } from 'nostr-tools';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {
  public events: NostrEvent[] = [];
  public userMetadata: any = {};
  public publicKey: string = '';
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private nostrService: NostrService, 
    private route: ActivatedRoute, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.publicKey = this.nostrService.convertBech32ToHex(params['pubkey']);
      this.loadUserProfile(this.publicKey);
      this.loadEvents(this.publicKey);
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      //this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  async loadUserProfile(pubkey: string) {
    this.userMetadata = await this.nostrService.fetchUserMetadata(pubkey);
  }

  async loadEvents(pubkey: string) {
    this.events = await this.nostrService.fetchEvents(pubkey);
  }

  isMyMessage(event: NostrEvent): boolean {
    return event.pubkey === this.publicKey;
  }

  parseContent(content: string): string {
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

  navigateToEvent(pubkey: string) {
    this.router.navigate(['/events', pubkey]);
  }
}
