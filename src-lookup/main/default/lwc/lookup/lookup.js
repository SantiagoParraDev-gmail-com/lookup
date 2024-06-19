import { reduceErrors } from "c/ldsUtils";
import { LightningElement, api, wire, track } from "lwc";
import getDefaultSearchResults from "@salesforce/apex/LookupControllerHandler.getDefaultSearchResults";
import getSearchResults from "@salesforce/apex/LookupControllerHandler.getSearchResults";
import getSelection from "@salesforce/apex/LookupControllerHandler.getSelection";

export default class SobjectLookup extends LightningElement {
  @api actions;
  @api disabled;
  @api fieldLevelText;
  @api isMultiEntry;
  @api label;
  @api messageWhenValueMissing;
  @api minSearchTermLength;
  @api placeholder;
  @api required;
  @api scrollAfterNItems;
  @api variant;
  @api uniqueId;
  @api useRawInput;
  @api payload = {};

  // an array of ids or a single id
  @api
  get value() {
    return this.state.value;
  }
  set value(value) {
    if (value !== this.state.value) {
      this.state.value = Array.isArray(value) ? value : [value];
    }
  }

  @track state = {};

  _value = [];
  _searchResults = [];
  _defaultSearchResults = [];

  @api
  get validity() {
    return this.lookupElement?.validity;
  }

  @api
  checkValidity() {
    return this.lookupElement?.checkValidity();
  }

  @api
  reportValidity() {
    return this.lookupElement?.reportValidity();
  }

  @api
  setCustomValidity(message) {
    return this.lookupElement?.setCustomValidity(message);
  }

  @api
  showHelpMessageIfInvalid() {
    this.lookupElement?.showHelpMessageIfInvalid();
  }

  @api
  focus() {
    this.lookupElement?.focus();
  }

  @api
  blur() {
    this.lookupElement?.blur();
  }

  @wire(getSelection, {
    uniqueId: "$uniqueId",
    values: "$value",
    payload: "$payload"
  })
  wiredGetSelection({ data, error }) {
    if (data) {
      this._value = data;
    } else if (error) {
      this.addError(error);
    }
  }

  @wire(getDefaultSearchResults, { uniqueId: "$uniqueId", payload: "$payload" })
  wiredGetDefaultSearchResults({ data, error }) {
    if (data) {
      this._defaultSearchResults = data;
    } else if (error) {
      this.addError(error);
    }
  }

  async handleSearch(event) {
    const { rawSearchTerm, searchTerm, selectedIds } = event.detail;

    try {
      this._searchResults = await getSearchResults({
        uniqueId: this.uniqueId,
        searchTerm: this.useRawInput
          ? rawSearchTerm
          : searchTerm,
        selectedIds,
        payload: this.payload
      });
    } catch (error) {
      this.addError(error);
    }
  }

  addError(error) {
    this.setCustomValidity(reduceErrors(error).join(", "));
    this.reportValidity();
  }

  get uniqueAccessibleData() {
    const unique = new Map();

    for (const result of this._defaultSearchResults.concat(
      this._searchResults
    )) {
      if (!unique.has(result.id)) {
        unique.set(result.id, result);
      }
    }

    return unique;
  }

  handleChange(event) {
    const value = event.detail.value;
    this._value = [...this.uniqueAccessibleData.values()].filter(({ id }) =>
      value.includes(id)
    );

    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          value,
          payload: this._value.reduce((map, { id, recordPayload }) => {
            map[id] = recordPayload;
            return map; 
          }, {})
        }
      })
    );
  }

  handleAction({ detail }) {
    this.dispatchEvent(new CustomEvent("action", { detail }));
  }

  handleInvalid({ detail }) {
    this.dispatchEvent(new CustomEvent("invalid", { detail }));
  }

  handleFocus() {
    this.dispatchEvent(new CustomEvent("focus"));
  }

  handleBlur() {
    this.dispatchEvent(new CustomEvent("blur"));
  }

  get lookupElement() {
    return this.refs.baseLookup;
  }
}
