import { LightningElement, api } from "lwc";
import { classSet, classListMutation } from "c/utils";

const SEARCH_DELAY = 300; // Wait 300 ms after user stops typing then, peform search

const KEY_ARROW_UP = 38;
const KEY_ARROW_DOWN = 40;
const KEY_ENTER = 13;

const VARIANT_LABEL_STACKED = "label-stacked";
const VARIANT_LABEL_INLINE = "label-inline";
const VARIANT_LABEL_HIDDEN = "label-hidden";
const MATCHER_REGEX = "<strong>$1</strong>";

const REGEX_SOSL_RESERVED =
  /(\?|&|\||!|\{|\}|\[|\]|\(|\)|\^|~|\*|:|"|\+|-|\\)/g;
const REGEX_EXTRA_TRAP = /(\$|\\)/g;

const TEXT_TYPES = [
  "lightning-formatted-rich-text",
  "lightning-formatted-text"
];

export default class BaseLookup extends LightningElement {
  // Public properties
  @api disabled = false;
  @api fieldLevelText = "";
  @api isMultiEntry = false;
  @api label = "";

  @api placeholder = "";
  @api required = false;
  @api scrollAfterNItems = "*";
  @api messageWhenValueMissing = "Complete this field.";

  // Template properties
  loading = false;
  searchResultsLocalState = [];
  _helpMessage;

  // Private properties
  _variant = VARIANT_LABEL_STACKED;
  _cancelBlur = false;
  _cleanSearchTerm;
  _curSelection = [];
  _defaultSearchResults = [];
  _focusedResultIndex = null;
  _hasFocus = false;
  _isDirty = false;
  _minSearchTermLength = 2;
  _searchResults = [];
  _searchTerm = "";
  _searchThrottlingTimeout;

  // PUBLIC FUNCTIONS AND GETTERS/SETTERS

  @api
  get minSearchTermLength() {
    return this._minSearchTermLength;
  }
  set minSearchTermLength(value) {
    if (Number.isInteger(value)) {
      this._minSearchTermLength = value;
    }
  }

  @api
  get variant() {
    return this._variant;
  }

  set variant(value) {
    this._variant = value;
    this.updateClassList();
  }

  @api actions = [];

  @api
  get value() {
    return this._curSelection;
  }

  set value(value) {
    if (value) {
      this._curSelection = Array.isArray(value) ? value : [value];
      this.processSelectionUpdate(false);
    }
  }

  @api
  get validity() {
    return { valid: !this.hasMissingValue() && !this._helpMessage };
  }

  @api
  checkValidity() {
    const valid = this.validity.valid;

    if (!valid) {
      this.dispatchEvent(new CustomEvent("invalid", { cancellable: true }));
    }

    return valid;
  }

  @api
  reportValidity() {
    if (this.hasMissingValue()) {
      this._helpMessage = this.messageWhenValueMissing;
    } else if (this._helpMessage === this.messageWhenValueMissing) {
      this._helpMessage = "";
    }

    const valid = this.checkValidity();

    this.classList.toggle("slds-has-error", !valid);

    this._showHelpMessage = !valid;

    return valid;
  }

  @api
  setCustomValidity(message) {
    this._helpMessage = message;
  }

  @api
  showHelpMessageIfInvalid() {
    this.reportValidity();
  }

  @api
  get searchResults() {
    return this._searchResults;
  }

  set searchResults(value) {
    if (Array.isArray(value)) {
      this.setSearchResults(value);
    }
  }

  @api
  get defaultSearchResults() {
    return this._defaultSearchResults;
  }

  set defaultSearchResults(value) {
    if (Array.isArray(value)) {
      this._defaultSearchResults = [...value];
      // if (!this._searchResults.length) {
      this.setSearchResults(this._defaultSearchResults);
      // }
    }
  }

  setSearchResults(results) {
    // Reset the spinner
    this.loading = false;
    // Remove selected items from search results
    const selectedIds = this._curSelection.map((sel) => sel.id);
    // Clone results before modifying them to avoid Locker restriction
    const resultsLocal = JSON.parse(JSON.stringify(results)).filter(
      ({ id }) => !selectedIds.includes(id)
    );
    // Format results
    const cleanSearchTerm = this._searchTerm
      .replace(REGEX_SOSL_RESERVED, ".?")
      .replace(REGEX_EXTRA_TRAP, "\\$1");
    const regex = new RegExp(`(${cleanSearchTerm})`, "gi");
    this._searchResults = resultsLocal.map((result) => {
      result.titleFormatted =
        this._searchTerm.length && result.title
          ? result.title.replace(regex, MATCHER_REGEX)
          : result.title;

      // Format subtitles

      if (result.subtitles?.length) {
        result.hasSubtitles = true;
        result.subtitlesFormatted = result.subtitles.map((subtitle, index) => {
          subtitle.index = index;

          if (subtitle.type === "lightning-icon") {
            subtitle.isLightningIcon = true;
          }

          const isTextType =
            !subtitle.type || TEXT_TYPES.includes(subtitle.type);
          if (
            isTextType &&
            subtitle.highlightSearchTerm &&
            this._searchTerm.length
          ) {
            const sub = "" + subtitle.value;
            subtitle.value = subtitle.value
              ? sub.replace(regex, MATCHER_REGEX)
              : sub;
          }

          return subtitle;
        });
      }

      return result;
    });
    // Add local state and dynamic class to search results
    this._focusedResultIndex = null;
    const self = this;
    this.searchResultsLocalState = this._searchResults.map((result, i) => {
      return {
        result,
        state: {},
        get classes() {
          return classSet("slds-media")
            .add("slds-media_center")
            .add("slds-listbox__option")
            .add("slds-listbox__option_entity")
            .add({
              "slds-listbox__option_has-meta": result.subtitlesFormatted?.length
            })
            .add({ "slds-has-focus": self._focusedResultIndex === i })
            .toString();
        }
      };
    });
  }

  @api
  focus() {
    this.template.querySelector("input")?.focus();
  }

  @api
  blur() {
    this.template.querySelector("input")?.blur();
  }

  // INTERNAL FUNCTIONS

  updateSearchTerm(newSearchTerm) {
    this._searchTerm = newSearchTerm;

    // Compare clean new search term with current one and abort if identical
    const newCleanSearchTerm = newSearchTerm
      .trim()
      .replace(REGEX_SOSL_RESERVED, "?")
      .toLowerCase();
    if (this._cleanSearchTerm === newCleanSearchTerm) {
      return;
    }

    // Save clean search term
    this._cleanSearchTerm = newCleanSearchTerm;

    // Ignore search terms that are too small after removing special characters
    if (
      newCleanSearchTerm.replace(/\?/g, "").length < this._minSearchTermLength
    ) {
      this.setSearchResults(this._defaultSearchResults);
      return;
    }

    // Apply search throttling (prevents search if user is still typing)
    if (this._searchThrottlingTimeout) {
      clearTimeout(this._searchThrottlingTimeout);
    }
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._searchThrottlingTimeout = setTimeout(() => {
      // Send search event if search term is long enougth
      if (this._cleanSearchTerm.length >= this._minSearchTermLength) {
        // Display spinner until results are returned
        this.loading = true;

        this.dispatchEvent(
          new CustomEvent("search", {
            detail: {
              searchTerm: this._cleanSearchTerm,
              rawSearchTerm: newSearchTerm,
              selectedIds: this._curSelection.map(({ id }) => id)
            }
          })
        );
      }
      this._searchThrottlingTimeout = null;
    }, SEARCH_DELAY);
  }

  isSelectionAllowed() {
    return this.isMultiEntry || !this.hasSelection();
  }

  hasSelection() {
    return this._curSelection.length;
  }

  processSelectionUpdate(isUserInteraction) {
    // Reset search
    this._cleanSearchTerm = "";
    this._searchTerm = "";
    this.setSearchResults([...this._defaultSearchResults]);
    // Indicate that component was interacted with
    this._isDirty = isUserInteraction;
    // Blur input after single select lookup selection
    if (this.isSingleEntry && this.hasSelection()) {
      // this._hasFocus = false;
    }
    // If selection was changed by user, notify parent components
    if (isUserInteraction) {
      let value = this._curSelection.map(({ id }) => id);

      this.dispatchEvent(new CustomEvent("change", { detail: { value } }));
    }
  }

  // EVENT HANDLING

  handleInput(event) {
    // Prevent action if selection is not allowed
    if (!this.isSelectionAllowed()) {
      return;
    }
    this.updateSearchTerm(event.target.value);
  }

  handleKeyDown(event) {
    if (this._focusedResultIndex === null) {
      this._focusedResultIndex = -1;
    }
    if (event.keyCode === KEY_ARROW_DOWN) {
      // If we hit 'down', select the next item, or cycle over.
      this._focusedResultIndex++;
      if (this._focusedResultIndex >= this._searchResults.length) {
        this._focusedResultIndex = 0;
      }
      event.preventDefault();
    } else if (event.keyCode === KEY_ARROW_UP) {
      // If we hit 'up', select the previous item, or cycle over.
      this._focusedResultIndex--;
      if (this._focusedResultIndex < 0) {
        this._focusedResultIndex = this._searchResults.length - 1;
      }
      event.preventDefault();
    } else if (
      event.keyCode === KEY_ENTER &&
      this._hasFocus &&
      this._focusedResultIndex >= 0
    ) {
      // If the user presses enter, and the box is open, and we have used arrows,
      // treat this just like a click on the listbox item
      const { id } = this._searchResults[this._focusedResultIndex];
      this.template.querySelector(`[data-recordid="${id}"]`).click();
      event.preventDefault();
    }
  }

  handleResultClick(event) {
    const recordId = event.currentTarget.dataset.recordid;

    // Save selection
    const selectedItem = this._searchResults.find(({ id }) => id === recordId);

    if (!selectedItem) {
      return;
    }
    this._curSelection = [...this._curSelection, selectedItem];

    // Process selection update
    this.processSelectionUpdate(true);
  }

  handleComboboxMouseDown(event) {
    const mainButton = 0;
    if (event.button === mainButton) {
      this._cancelBlur = true;
    }
  }

  handleComboboxMouseUp() {
    this._cancelBlur = false;
    // Re-focus to text input for the next blur event
    this.template.querySelector("input").focus();
  }

  handleFocus() {
    // Prevent action if selection is not allowed
    // if (!this.isSelectionAllowed()) {
    //   return;
    // }
    this._hasFocus = true;
    this._focusedResultIndex = null;
    this.dispatchEvent(new CustomEvent("focus"));
  }

  handleBlur() {
    // Prevent action if cancelled
    if (this._cancelBlur) {
      this._cancelBlur = false;
      return;
    }
    this._hasFocus = false;
    this.showHelpMessageIfInvalid();
    this.dispatchEvent(new CustomEvent("blur"));
  }

  handleRemoveSelectedItem(event) {
    if (this.disabled) {
      return;
    }
    const recordId = event.currentTarget.name;
    this._curSelection = this._curSelection.filter(({ id }) => id !== recordId);
    // Process selection update
    this.processSelectionUpdate(true);
    // this._cancelBlur = true;

    if (!this.hasSelection()) {
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.template.querySelector("input").focus();
      }, 0);
    }
  }

  handleClearSelection() {
    this._curSelection = [];
    this._hasFocus = false;
    // Process selection update
    this.processSelectionUpdate(true);
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.template.querySelector("input").focus();
    }, 0);
  }

  handleActionClick(event) {
    const actionName = event.currentTarget.dataset.name;
    this.dispatchEvent(new CustomEvent("action", { detail: actionName }));
  }

  // STYLE EXPRESSIONS

  get isSingleEntry() {
    return !this.isMultiEntry;
  }

  get isListboxOpen() {
    const isSearchTermValid =
      this._cleanSearchTerm &&
      this._cleanSearchTerm.length >= this._minSearchTermLength;
    return (
      this._hasFocus &&
      this.isSelectionAllowed() &&
      (isSearchTermValid || this.hasResults || this.actions?.length)
    );
  }

  get hasResults() {
    return this._searchResults.length;
  }

  get getContainerClass() {
    return classSet("slds-combobox_container")
      .add({ "has-custom-error": this._helpMessage })
      .toString();
  }

  get getDropdownClass() {
    return classSet("slds-combobox")
      .add("slds-dropdown-trigger")
      .add("slds-dropdown-trigger_click")
      .add({ "slds-is-open": this.isListboxOpen })
      .toString();
  }

  get getInputClass() {
    const css = classSet("slds-input")
      .add("slds-combobox__input")
      .add("has-custom-height")
      .add({ "slds-has-focus": this._hasFocus && this.hasResults })
      .add({ "has-custom-error": this._helpMessage });

    if (!this.isMultiEntry) {
      css.add("slds-combobox__input-value");
      css.add({ "has-custom-border": this.hasSelection() });
    }

    return css.toString();
  }

  get getComboboxClass() {
    const iconClass =
      this.isMultiEntry || !this.hasSelection()
        ? "slds-input-has-icon_right"
        : "slds-input-has-icon_left-right";

    return classSet("slds-combobox__form-element")
      .add("slds-input-has-icon")
      .add(iconClass)
      .toString();
  }

  get getSearchIconClass() {
    return classSet("slds-input__icon")
      .add("slds-input__icon_right")
      .add({ "slds-hide": !this.isMultiEntry && this.hasSelection() })
      .toString();
  }

  get getClearSelectionButtonClass() {
    return classSet("slds-button")
      .add("slds-button_icon")
      .add("slds-input__icon")
      .add("slds-input__icon_right")
      .add({ "slds-hide": !this.hasSelection() })
      .toString();
  }

  get getSelectIconName() {
    return this.hasSelection() && this._curSelection[0].icon?.iconName
      ? this._curSelection[0].icon.iconName
      : "standard:default";
  }

  get getSelectIconClass() {
    return classSet("slds-combobox__input-entity-icon")
      .add({ "slds-hide": !this.hasSelection() })
      .toString();
  }

  get getInputValue() {
    return this.isMultiEntry || !this.hasSelection()
      ? this._searchTerm
      : this._curSelection[0].title;
  }

  get getInputTitle() {
    return this.isMultiEntry || !this.hasSelection()
      ? ""
      : this._curSelection[0].title;
  }

  get getListboxClass() {
    const iconClass = `slds-dropdown_length-with-icon-${this.scrollAfterNItems}`;
    return classSet("slds-dropdown")
      .add({ [iconClass]: this.scrollAfterNItems })
      .add("slds-dropdown_fluid")
      .toString();
  }

  get isInputReadonly() {
    return this.isMultiEntry ? false : this.hasSelection();
  }

  connectedCallback() {
    this.classList.add("slds-form-element");
    this.updateClassList();
  }

  updateClassList() {
    classListMutation(this.classList, {
      "slds-form-element_stacked": this._variant === VARIANT_LABEL_STACKED,
      "slds-form-element_horizontal": this._variant === VARIANT_LABEL_INLINE
    });
  }

  get displayHelpMessage() {
    return this._showHelpMessage && this._helpMessage;
  }

  get computedLabelClass() {
    return classSet("slds-form-element__label")
      .add({ "slds-assistive-text": this.variant === VARIANT_LABEL_HIDDEN })
      .toString();
  }

  hasMissingValue() {
    return this.required && !this.disabled && !this.hasSelection();
  }
}
