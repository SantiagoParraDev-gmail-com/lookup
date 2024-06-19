import { LightningElement, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class WorkingWithPayloads extends NavigationMixin( LightningElement ) {

  @track contactPayload;
  accountValue;
  contactValue;
  selectedAccount;
  selectedContact;

  handleAccountChange(event) {

    this.contactValue = [];
    this.selectedAccount = undefined;
    this.selectedContact = undefined;
    this.accountValue = event.detail.value[0];
    this.contactPayload = { accountId : event.detail.value[0] };
    this.selectedAccount = event.detail.payload[this.accountValue];
  }

  handleContactChange(event) {

    this.selectedContact = undefined;
    this.contactValue = event.detail.value[0];
    this.selectedContact = event.detail.payload[this.contactValue];
  }

  get hasNotAccount() {
    return !this.accountValue;
  }
}