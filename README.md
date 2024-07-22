# Salesforce Lookup Component

[![Github Workflow](https://github.com/pozil/sfdc-ui-lookup-lwc/workflows/CI/badge.svg?branch=master)](https://github.com/pozil/sfdc-ui-lookup-lwc/actions) [![codecov](https://codecov.io/gh/pozil/sfdc-ui-lookup-lwc/branch/master/graph/badge.svg)](https://codecov.io/gh/pozil/sfdc-ui-lookup-lwc) ![a11y friendly](https://img.shields.io/badge/a11y-friendly-green)

<p align="center">
    <img src="screenshots/lookup-animation.gif" alt="Lookup animation"/>
</p>

<img src="screenshots/dropdown-open.png" alt="Lookup with dropdown open" width="350" align="right"/>

- [Salesforce Lookup Component](#salesforce-lookup-component)
  - [About](#about)
  - [Getting Started](#getting-started)
  - [Write the `getSelection()` method](#write-the-getselection-method)
  - [Write the `getSearchResults()` method](#write-the-getsearchresults-method)
  - [Write the `getDefaultSearchResults()` method](#write-the-getdefaultsearchresults-method)
  - [Work with contexts using `payload`](#work-with-contexts-using-payload)
    - [Get Context (Apex to LightningWebComponent)](#get-context-apex-to-lightningwebcomponent)
    - [Get Context (LightningWebComponent to Apex)](#get-context-lightningwebcomponent-to-apex)
  - [Personalize your lookup results](#personalize-your-lookup-results)
  - [Add Actions (optional)](#add-actions-optional)
  - [Attributes](#attributes)
  - [Functions](#functions)
  - [Events](#events)
  - [LookupResult](#lookupresult)
  - [LookupResult.Subtitle](#lookupresultsubtitle)

## About

This is a generic lookup component
It does not rely on third party libraries and you have full control over its datasource.

<b>Features</b>

The lookup component provides the following features:

- customizable data source
- single or multiple selection mode
- client-side caching & request throttling
- great test coverage
- full accessibility (a11y) compliance
- keyboard navigation
- search term highlighting
- ability to setup actions

<p align="center">
    <img src="screenshots/selection-types.png" alt="Multiple or single entry lookup"/>
</p>

## Getting Started

1. **Define your apex data source**

    Create your apex class that implements the following interface `LookupResult.ILookupResult`

    ```apex
    public class ContactLookup implements LookupResult.ILookupResult {
        public List<LookupResult> getSelection()...
        public List<LookupResult> getDefaultSearchResults...
        public List<LookupResult> getSearchResults...
    }
    ```

2. **Create the `LookupDefinition` record**
   
   Go to Setup > Custom Metadata Types > click in  Manage Records (LookupDefinition) > add a new record

   **Label**: `String`<br/>
   **ApiName**: `String`<br/>
   **Interface**: `String` (*the name of your apex class*)

   **IMPORTANT** `ApiName` *should match your* `unique-id`

3. **Use the lookup component**
    ```html
    <c-lookup
        unique-id="Contact_Lookup_123"
    ></c-lookup>
    ```
    **IMPORTANT**: `unique-id` *should match your* `ApiName`

<br/>
<br/>
<br/>

## Write the `getSelection()` method

This method is used to get the selected element when the  `@api value` is set

```apex
public List<LookupResult> getSelection(List<String> selectedIds, Map<String, Object> payload) {
    List<LookupResult> result = new List<LookupResult>();

    for (Contact contact : [SELECT Id FROM Contact WHERE Id IN: selectedIds]) {
        result.add(buildResult(contact));
    }

    return result;
}
```

## Write the `getSearchResults()` method

this method is responsible to build the results whenever the user types in the lookup

```apex
public List<LookupResult> getDefaultSearchResults(
    String searchTerm,
    List<String> selectedIds,
    Map<String, Object> payload) {

    List<LookupResult> result = new List<LookupResult>();

    // selectedIds = list of selected records in the lookup

    searchTerm = '%' + searchTerm + '%';

    for (Contact contact : [
        SELECT Name, Email
        FROM Contact
        WHERE
            Id NOT IN :selectedIds
            AND (Name LIKE :searchTerm OR Phone LIKE :searchTerm)]) {
        result.add(buildResult(contact));
    }

    return result;
}
```

## Write the `getDefaultSearchResults()` method 

These are the results you display when there is no input in the lookup, typically you would use this to display record recomendations such as recently viewed or a plain set of records sorted by some priority. If you dont want to display anything just return an empty List

```apex
public List<LookupResult> getDefaultSearchResults(Map<String, Object> payload) {
    List<LookupResult> result = new List<LookupResult>();

    for (Contact contact : [SELECT Id FROM Contact LIMIT 10]) {
        result.add(buildResult(contact));
    }

    return result;
}
```
**RECOMMENDED**: `selectedIds` *is the Id selected, use in `getSelection()` method and `getSearchResults()` method*

## Work with contexts using `payload`

### Get Context (Apex to LightningWebComponent)

When you build the `LookupResults` you can use recordPayload to pass more information for each lookup result

```apex
LookupResult singleLookupResult = new LookupResult();
singleLookupResult.id = 'someNurseId';
singleLookupResult.recordPayload = new Map<String, Object> {
    'type': 'nurse',
    'name': 'johana',
};
```

```html
<c-lookup
    lwc:ref="lookup"
    unique-id="Nurses_Lookup"
    onchange={handleChange}>
</c-lookup>
```

```js
handleChange(event) {
    const value = event.detail.value;// ["someId", "someId2", "someId3"]
    const payload = { someId : event.detail.value };// {"someId": {type: nurse, name : johana}, someId2: {ty...}}
    //this create a copy of the payload of the id consulted
    // TODO: do something with the selection
}
```
*You can also access the record payload using the* `getRecordPayload()` *public method*

### Get Context (LightningWebComponent to Apex)

```js
payload = {
    AccountId: 'SomeAccountId',
    Type: 'BusinessAccount',
    Foo: {
        Bar: 'Foo'
    }
};
```

```html
<c-lookup
    unique-id="Contact_Lookup"
    field-level-text="This lookup will filter by Account"
    payload={payload}>
</c-lookup>
```

```apex
String accountId = (String) payload.get('AccountId'); // SomeAccountId
String type = (String) payload.get('Type'); // BusinessAccount
String foo = (String) payload.get('Foo').get('Bar'); // nestedProperties are allowed
```
## Personalize your lookup results

You can customize how your lookup results display <br/>
the following example show you can build lookup result for a contact
it displays the name as the title with standard:contact icon and some subtitles with specific format options such as lightning-formatted-email or lightning-icon for more information see 

```apex
LookupResult result = new LookupResult();
result.id = contact.Id;
result.icon = new Map<String, Object> {
    'iconName' => 'standard:contact'
};
result.title = contact.Name;
result.recordPayload = contact.getPopulatedFieldsAsMap();
List<LookupResult.Subtitle> subtitles = new List<LookupResult.Subtitle>();

if (String.isNotBlank(contact.Email)) {
    LookupResult.Subtitle email = new LookupResult.Subtitle();
    email.type = 'lightning-formatted-email';
    email.label = 'Email';
    email.value = contact.Email;
    email.props = new Map<String, Object>{ 'hideIcon' => true };
    subtitles.add(email);
}

LookupResult.Subtitle optedOut = new LookupResult.Subtitle();
optedOut.type = 'lightning-icon';
optedOut.label = 'Opted out of email';
optedOut.props = new Map<String, Object>{
    'iconName' => contact.HasOptedOutOfEmail
    ? 'utility:email'
    : 'utility:end_chat'
};
subtitles.add(optedOut);

result.subtitles = subtitles;
```

## Add Actions (optional)

use `actions` to define custom actions on the component <br/>
you can handle the `action` event to perform operations whenever an action is triggered

```html
<c-lookup
    unique-id="AccountAndOpportunitiesLookup"
    actions={actions}
    onaction={handleAction}
></c-lookup>
```

```js
actions = [
    { name: "newAccount", label: "New Account" },
    { name: "newOpportunity", label: "New Opportunity" }
];

handleAction(event) {
    if (event.detail === "newAccount") {
        // do something such as navigate to the new record page
        this[NavigationMixin.Navigate]({
            type: "standard__objectPage",
            attributes: {
                objectApiName: "Account",
                actionName: "new"
            }
        });
    } else if (event.detail === "newOpportunity") {
        // do something
    }
}
```


## Attributes

| Attribute | Type      | Description | Default |
| --------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `uniqueId` | `String` | (**required**) your metadata Lookup QualifiedApiName see **Create the Lookup metadata** | `null` |
| `disabled`| `Boolean` | Whether the lookup selection can be changed.    | `false` |
| `isMultiEntry` | `Boolean` | Whether the lookup is single (default) or multi entry.      | `false` |
| `label`   | `String`  | Optional (but recommended) lookup label. Label is hidden if attribute is omitted but this breaks accessibility. If you don't want to display it, we recommend to provide a label but hide it with `variant="label-hidden"`. | `''`|
| `minSearchTermLength` | `Number`  | Minimum number of characters required to perform a search.  | `2` |
| `actions`    | `[{ "name": String, "label": String }]` | List of actions that can be capture using the `action` event | `[]`|
| `placeholder` | `String`  | Lookup placeholder text.| `''`|
| `fieldLevelText` | `String`  | Text that gets displayed besides the label using a lightning-helptext.<br/> (there has to be a `label`)| `''`|
| `required`| `Boolean` | Whether the lookup is a required field. Note: Property can be set with `<c-lookup required>`.   | `false` |
| `scrollAfterNItems`   | `Number`  | A null or integer value used to force overflow scroll on the result listbox after N number of items.<br/>Valid values are `null`, `5`, `7`, or `10`.<br/>Use `null` to disable overflow scrolling.  | `null`  |
| `value`   | `[String]` OR `String`| and Array of ids or a single id | `[]`|
| `validity`| `{ "valid": Boolean }`| Read-only property used for datatable integration. Reports whether there are errors or not (see `errors`).  | `false` |
| `variant` | `String`  | Changes the appearance of the lookup. Accepted variants:<br/>`label-stacked` - places the label above the lookup.<br/>`label-hidden` - hides the label but make it available to assistive technology.<br/>`label-inline` - aligns horizontally the label and lookup.    | `label-stacked` |
| `messageWhenValueMissing` | `String` | text to display when the input is required as is missing value | `''` |
| `useRawInput` | `boolean` | By default the user input get sanitized set to true if you want to get the raw user input | `false` |
| `payload` | `Object` | Use it to pass data from your component to your apex class configuration | `{}` |


## Functions

| Function | Description|
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkValidity()` | Places focus on the component an opens the search dropdown (unless this is a single selection lookup with a selection).|
| `reportValidity()` | Displays the error messages and returns false if the input is invalid If the input is valid, reportValidity() clears displayed error messages and returns true. |
| `setCustomValidity(message)` | Sets a custom error message to be displayed when the lookup value is submitted. |
| `showHelpMessageIfInvalid()`  | Shows the help message if the lookup is in an invalid state. |
| `focus()`  | Sets focus on the lookup |
| `blur()`  | Removes focus from the lookup |
| `getRecordPayload()`  | Returns the selectedRecords and their payloads |

## Events

| Event | Description   | `event.detail` Type      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `action`  | event fired when user clicks on the actions (see **actions**) | `{ name: String }`  |
| `change` | Event fired when the selection of the lookup changes value holds an array with the selected ids and payload holds any aditional information passed from the apex class to the component using the payload attribute | `{ value: [String], payload: {} }` |
| `invalid` | whenever the state of the lookup is invalid (see **checkValidity** or **reportValidity**) | `{}` |

## LookupResult

| Property | Description   | Type |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `id`  | unique identifier of the lookup result | `String`  |
| `icon` | displays an icon using lightning-icon | `Map<String, object>` |
| `title` | main displayable title for the lookup | `String` |
| `recordPayload` | payload to pass record information to the component | `Map<String, object>` |
| `subtitles` | and array of subtitles see (#LookupResult.Subtitle) | `List<LookupResult.Subtitle>` |

## LookupResult.Subtitle

| Property | Description   | Type |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `type`  | the component used to format the data valid values are `lightning-icon`, `lightning-formatted-number`, `lightning-formatted-text`, `lightning-formatted-time`, `lightning-formatted-date-time`, `lightning-formatted-email`, `lightning-formatted-url`, `lightning-formatted-rich-text` | `String`  |
| `label` | a label for the subtitle | `String` |
| `value` | value to display | `String` |
| `props` | these props are applied to the component via lwc:spread | `Map<String, object>` |
| `highlightSearchTerm` | set to true if you want to hightlight your search input into the subtitle as well(only works with type `lightning-formatted-rich-text`) | `Boolean` |