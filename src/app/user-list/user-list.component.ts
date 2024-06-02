import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NostrService } from '../nostr.service';
import { nip19 } from 'nostr-tools'; // Import nip19 for Bech32 conversion

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  public users: { pubkey: string, name?: string, picture?: string }[] = [
    { pubkey: '1577e4599dd10c863498fe3c20bd82aafaf829a595ce83c5cf8ac3463531b09b' },
    { pubkey: '17e2889fba01021d048a13fd0ba108ad31c38326295460c21e69c43fa8fbe515' },
    { pubkey: '1833ee04459feb2ca4ae690d5f31269ad488c69e5fe903a42b532c677c4a8170' }
  ];
  public newUserPubkey: string = '';

  constructor(private nostrService: NostrService, private router: Router) {}

  ngOnInit(): void {
    this.loadUsersFromLocalStorage();
    this.loadUserMetadata();
  }

  async addUser() {
    if (this.newUserPubkey.trim() !== '') {
      let pubkey = this.newUserPubkey;
      // Convert Bech32 to hex if necessary
      if (pubkey.startsWith('npub')) {
        try {
          const { data } = nip19.decode(pubkey);
          pubkey = data as string;
        } catch (error) {
          console.error('Invalid Bech32 format', error);
          return;
        }
      }
      const metadata = await this.nostrService.fetchUserMetadata(pubkey);
      this.users.push({ pubkey, name: metadata?.display_name, picture: metadata?.picture });
      this.saveUsersToLocalStorage();
      this.newUserPubkey = '';
    }
  }

  loadUsersFromLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      const storedUsers = JSON.parse(localStorage.getItem('nostrUsers') || '[]');
      this.users = [...this.users, ...storedUsers];
    }
  }

  saveUsersToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      const customUsers = this.users.filter(user => ![
        '1577e4599dd10c863498fe3c20bd82aafaf829a595ce83c5cf8ac3463531b09b',
        '17e2889fba01021d048a13fd0ba108ad31c38326295460c21e69c43fa8fbe515',
        '1833ee04459feb2ca4ae690d5f31269ad488c69e5fe903a42b532c677c4a8170'
      ].includes(user.pubkey));
      localStorage.setItem('nostrUsers', JSON.stringify(customUsers));
    }
  }

  async loadUserMetadata() {
    for (let user of this.users) {
      if (!user.name || !user.picture) {
        const metadata = await this.nostrService.fetchUserMetadata(user.pubkey);
        user.name = metadata?.display_name;
        user.picture = metadata?.picture;
      }
    }
  }

  viewEvents(pubkey: string) {
    this.router.navigate(['/events', pubkey]);
  }
}
