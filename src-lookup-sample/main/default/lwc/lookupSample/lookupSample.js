import { LightningElement, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import LightningAlert from "lightning/alert";
import getInitialSelection from "@salesforce/apex/GetInitialSelection.getInitialSelection";

export default class LookupSample extends NavigationMixin(
  LightningElement
) {
  isMultiEntry = true;
  maxSelectionSize = 2;
  notifyViaAlerts = false;
  value;
  payload = { accountName: 'Edge Communications' };
  actions = [
    { name: "newAccountAction", label: "New Account" },
    { name: "newOpportunityAction", label: "New Opportunity" }
  ];

  @wire(getInitialSelection)
  wiredData({ error, data }) {
    if (data) {
      this.value = data;
    } else if (error) {
      this.notifyUser(
        "Error",
        "Error while fetching initial selection.",
        "error"
      );
    }
  }

  /**
   * Handles the lookup selection change
   * @param {event} event `change` event emmitted by the lookup.
   * The event contains the list of selected ids.
   */
  // eslint-disable-next-line no-unused-vars
  handleChange(event) {
    this.checkForErrors();
  }

  handleAction(event) {
    if (event.detail === "newAccountAction") {
      this[NavigationMixin.Navigate]({
        type: "standard__objectPage",
        attributes: {
          objectApiName: "Account",
          actionName: "new"
        }
      });
    } else if (event.detail === "newOpportunityAction") {
      this[NavigationMixin.Navigate]({
        type: "standard__objectPage",
        attributes: {
          objectApiName: "Opportunity",
          actionName: "new"
        }
      });
    }
  }

  // All functions below are part of the sample app form (not required by the lookup).

  handleLookupTypeChange(event) {
    this.isMultiEntry = event.target.checked;
  }

  handleMaxSelectionSizeChange(event) {
    this.maxSelectionSize = event.target.value;
    this.checkForErrors();
  }

  handleSubmit() {
    const allValid = [
      ...this.template.querySelectorAll("lightning-input"),
      this.template.querySelector("c-sobject-lookup")
    ].reduce((validSoFar, inputCmp) => {
      inputCmp.reportValidity();
      return validSoFar && inputCmp.checkValidity();
    }, true);

    if (allValid) {
      this.notifyUser("Success", "The form was submitted.", "success");
    } else {
      this.notifyUser(
        "Error",
        "Please update the invalid form entries and try again.",
        "error"
      );
    }
  }

  handleClear() {
    this.value = [];
  }

  handleFocus() {
    this.lookupElement.focus();
  }

  checkForErrors() {
    const input = this.lookupElement;
    const { value } = input;
    // Custom validation rule
    if (this.isMultiEntry && value.length > this.maxSelectionSize) {
      input.setCustomValidity(
        `You may only select up to ${this.maxSelectionSize} items.`
      );
    } else {
      input.setCustomValidity(""); // if there was a custom error before, reset it
    }

    input.reportValidity(); // Tells lightning-input to show the error right away without needing interaction
  }

  async notifyUser(title, message, variant) {
    if (this.notifyViaAlerts) {
      await LightningAlert.open({ message, theme: variant, label: title });
    } else {
      // Notify via toast (only works in LEX)
      this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
  }

  get lookupElement() {
    return this.refs.lookup;
  }
}
