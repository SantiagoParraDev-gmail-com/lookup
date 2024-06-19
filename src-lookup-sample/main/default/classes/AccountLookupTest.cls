@IsTest
private class AccountLookupTest {
  @IsTest
  static void shouldCreateLookupResults() {
    // DATA
    Account account = new Account(Name = 'account name test');
    insert account;

    Map<String, Object> payload = new Map<String, Object>();
    payload.put('name', account.Name);

    // TEST
    Test.startTest();
    AccountLookup accountLookup = new AccountLookup();
    List<LookupResult> selectionResult = AccountLookup.getSelection(
      new List<String>{ account.Id },
      payload
    );
    List<LookupResult> defaultSearchResultsResult = AccountLookup.getDefaultSearchResults(
      payload
    );
    List<LookupResult> searchResultsResult = AccountLookup.getSearchResults(
      'accou',
      new List<String>(),
      payload
    );
    Test.stopTest();

    // ASSERT
    Assert.areEqual(
      selectionResult[0].Id,
      account.Id,
      'should get the selection'
    );
    Assert.areEqual(
      defaultSearchResultsResult[0].Id,
      account.Id,
      'should set getDefaultResults from recentlyViewed'
    );
    Assert.areEqual(
      searchResultsResult[0].Id,
      account.Id,
      'filters contacts using searchKey'
    );
  }
}
