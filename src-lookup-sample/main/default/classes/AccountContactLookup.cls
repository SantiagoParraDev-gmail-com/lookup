public class AccountContactLookup implements LookupResult.ILookupResult {

  public final static Map<String, Object> CONTACT_ICON = new Map<String, Object>{
    'iconName' => 'standard:contact'
  };

  public List<LookupResult> getSelection(List<String> selectedIds, Map<String, Object> payload) {

    String accountId = (String) payload.get('accountId');
    List<LookupResult> result = new List<LookupResult>();

    if (accountId == null) {
      return result;
    }

    List<Contact> contacts = [
      SELECT Name, Id, Phone
      FROM Contact
      WHERE AccountId = :accountId
      AND Id IN: selectedIds
    ];

    for (Contact contact : contacts) {
      result.add(buildResult(contact));
    }

    return result;
  }

  public List<LookupResult> getSearchResults(
    String searchTerm,
    List<String> selectedIds,
    Map<String, Object> payload) {

    String accountId = (String) payload.get('accountId');
    List<LookupResult> result = new List<LookupResult>();

    if (accountId == null) {
      return result;
    }

    searchTerm = '%' + searchTerm + '%';

    List<Contact> contacts = [
      SELECT Name, Email, Phone
      FROM Contact
      WHERE
        (Name LIKE :searchTerm
        OR Phone LIKE :searchTerm
        OR Email LIKE :searchTerm)
        AND AccountId = :accountId
        AND Id NOT IN :selectedIds
    ];

    for (Contact contact : contacts) {
      result.add(buildResult(contact));
    }

    return result;
  }

  public List<LookupResult> getDefaultSearchResults(Map<String, Object> payload) {

    String accountId = (String) payload.get('accountId');
    List<LookupResult> result = new List<LookupResult>();

    if (accountId == null) {
      return result;
    }

    List<Contact> contacts = [
      SELECT Name, id, Phone
      FROM Contact
      WHERE AccountId = :accountId
      LIMIT 10
    ];

    for (Contact contact : contacts) {
      result.add(buildResult(contact));
    }

    return result;
  }

  private LookupResult buildResult(Contact contact) {

    LookupResult result = new LookupResult();
    result.id = contact.Id;
    result.icon = CONTACT_ICON;
    result.title = contact.Name;
    result.recordPayload = new Map<String, Object> {
      'name' => contact.Name,
      'phone' => contact.Phone
    };

    return result;
  }
}