const {
  createLookupElement,
  inputSearchTerm,
  SAMPLE_SEARCH_ITEMS
} = require("./baseLookupTest.utils");

const SAMPLE_SEARCH_TOO_SHORT_WHITESPACE = "A ";
const SAMPLE_SEARCH_TOO_SHORT_SPECIAL = "a*";
const SAMPLE_SEARCH_RAW = "Sample search* ";
const SAMPLE_SEARCH_CLEAN = "sample search?";

describe("c-base-lookup event fires", () => {
  afterEach(() => {
    // The jsdom instance is shared across test cases in a single file so reset the DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("fires search event", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler
    const lookupEl = createLookupElement({
      isMultiEntry: true,
      value: SAMPLE_SEARCH_ITEMS
    });
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, SAMPLE_SEARCH_RAW);

    // Check fired search event
    expect(mockSearchFn).toHaveBeenCalledTimes(1);
    const searchEvent = mockSearchFn.mock.calls[0][0];
    expect(searchEvent.detail).toEqual({
      searchTerm: SAMPLE_SEARCH_CLEAN,
      rawSearchTerm: SAMPLE_SEARCH_RAW,
      selectedIds: ["id1", "id2"]
    });
  });

  it("does not fire search event when search term is too short with whitespace", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler
    const lookupEl = createLookupElement();
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, SAMPLE_SEARCH_TOO_SHORT_WHITESPACE);

    // Check that search event wasn't fired
    expect(mockSearchFn).not.toHaveBeenCalled();
  });

  it("does not fire search event when search term is too short with special chars", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler
    const lookupEl = createLookupElement();
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, SAMPLE_SEARCH_TOO_SHORT_SPECIAL);

    // Check that search event wasn't fired
    expect(mockSearchFn).not.toHaveBeenCalled();
  });

  it("does not fire search event when search term is under custom minimum length", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler and custom minimum search term length
    const lookupEl = createLookupElement({
      minSearchTermLength: SAMPLE_SEARCH_CLEAN.length + 1
    });
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, SAMPLE_SEARCH_CLEAN);

    // Check that search event wasn't fired
    expect(mockSearchFn).not.toHaveBeenCalled();
  });

  it("fires search event when search term is above custom minimum length", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler
    const lookupEl = createLookupElement({ minSearchTermLength: 5 });
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, "123456");

    // Check fired search event
    expect(mockSearchFn).toHaveBeenCalledTimes(1);
  });

  it("does not fire search event when search term is under custom minimum length with special characters", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler and custom minimum search term length
    const lookupEl = createLookupElement({ minSearchTermLength: 5 });
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, "1234*?");

    // Check that search event wasn't fired
    expect(mockSearchFn).not.toHaveBeenCalled();
  });

  it("fires search event when search term is above custom minimum length with special characters", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler
    const lookupEl = createLookupElement({ minSearchTermLength: 5 });
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, "123456*?");

    // Check fired search event
    expect(mockSearchFn).toHaveBeenCalledTimes(1);
  });

  it("does not fire search event twice when search term matches clean search term", () => {
    jest.useFakeTimers();

    // Create lookup with mock search handler
    const lookupEl = createLookupElement();
    const mockSearchFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);

    // Simulate search term input
    inputSearchTerm(lookupEl, SAMPLE_SEARCH_RAW);

    // Simulate search term input a second time
    inputSearchTerm(lookupEl, SAMPLE_SEARCH_CLEAN);

    // Check fired search events
    expect(mockSearchFn).toHaveBeenCalledTimes(1);
    const searchEvent = mockSearchFn.mock.calls[0][0];
    expect(searchEvent.detail).toEqual({
      searchTerm: SAMPLE_SEARCH_CLEAN,
      rawSearchTerm: SAMPLE_SEARCH_RAW,
      selectedIds: []
    });
  });

  it("fires action event when action is clicked", async () => {
    jest.useFakeTimers();

    // Create lookup with search handler and new record options
    const actions = [{ name: "NewAccount", label: "New Account" }];
    const lookupEl = createLookupElement({ actions });
    const mockSearchFn = jest.fn();
    const actionFn = jest.fn();
    lookupEl.addEventListener("search", mockSearchFn);
    lookupEl.addEventListener("action", actionFn);

    // Simulate search term input
    await inputSearchTerm(lookupEl, SAMPLE_SEARCH_RAW);

    // Simulate mouse selection
    const newRecordEl = lookupEl.shadowRoot.querySelector("div[data-name]");
    newRecordEl.click();

    // Check fired search event
    expect(newRecordEl).not.toBeNull();
    expect(actionFn).toHaveBeenCalledTimes(1);
  });
});
