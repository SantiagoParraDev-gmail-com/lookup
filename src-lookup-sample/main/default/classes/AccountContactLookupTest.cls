@IsTest
private class AccountContactLookupTest {
  @IsTest
  static void shouldCreateLookupResults() {
    // DATA
    Account account = new Account(Name = 'account name test');
    insert account;

    Contact contact = new Contact(
      FirstName = 'FirstName',
      LastName = 'LastName',
      Phone = '123456789',
      Email = 'FirstName.LastName@example.com',
      HasOptedOutOfEmail = false,
      AccountId = account.Id
    );
    insert contact;

    Map<String, Object> payload = new Map<String, Object>();
    payload.put('accountId', account.Id);

    // TEST
    Test.startTest();
    AccountContactLookup accountContactLookup = new AccountContactLookup();
    List<LookupResult> selectionResult = AccountContactLookup.getSelection(
      new List<String>{ contact.id },
      payload
    );
    List<LookupResult> defaultSearchResultsResult = AccountContactLookup.getDefaultSearchResults(
      payload
    );
    List<LookupResult> searchResultsResult = AccountContactLookup.getSearchResults(
      '123',
      new List<String>(),
      payload
    );
    Test.stopTest();

    // ASSERT
    Assert.areEqual(
      selectionResult[0].id,
      contact.id,
      'should get the selection'
    );
    Assert.areEqual(
      defaultSearchResultsResult[0].id,
      contact.id,
      'should set getDefaultResults from recentlyViewed'
    );
    Assert.areEqual(
      searchResultsResult[0].id,
      contact.id,
      'filters contacts using searchKey'
    );
  }
}
