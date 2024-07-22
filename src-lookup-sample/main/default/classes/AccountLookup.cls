public class AccountLookup implements LookupResult.ILookupResult {

  public final static Map<String, Object> ACCOUNT_ICON = new Map<String, Object>{
    'iconName' => 'standard:account'
  };

  public List<LookupResult> getSelection(List<String> selectedIds, Map<String, Object> payload) {

    List<LookupResult> result = new List<LookupResult>();

    for (Account account : [SELECT Id, Name FROM Account WHERE Id IN: selectedIds]) {
      result.add(buildResult(account));
    }

    return result;
  }

  public List<LookupResult> getSearchResults(
    String searchTerm,
    List<String> selectedIds,
    Map<String, Object> payload) {

    List<LookupResult> result = new List<LookupResult>();
    searchTerm = '%' + searchTerm + '%';

    for (Account account : [
      SELECT Id, Name
      FROM Account
      WHERE
        Name LIKE :searchTerm
        AND Id NOT IN :selectedIds
      ]) {
      result.add(buildResult(account));
    }

    return result;
  }

  public List<LookupResult> getDefaultSearchResults(Map<String, Object> payload) {

    List<LookupResult> result = new List<LookupResult>();

    for (Account account : [SELECT Id, Name FROM Account LIMIT 10]) {
      result.add(buildResult(account));
    }

    return result;
  }

  private LookupResult buildResult(Account account) {

    LookupResult result = new LookupResult();
    result.id = account.Id;
    result.icon = ACCOUNT_ICON;
    result.title = account.Name;
    result.recordPayload = new Map<String, Object> {
      'name' => account.Name 
    };

    return result;
  }
}