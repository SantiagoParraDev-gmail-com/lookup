import { createElement } from 'lwc';
import WorkingWithPayloads from 'c/workingWithPayloads';

describe('c-working-with-payloads', () => {
  afterEach(() => {
    // The jsdom instance is shared across test cases in a single file so reset the DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('this should show a text with account name when selected the account and contact name and phone when selected contact', async () => {
    // Arrange
    const element = createElement('c-working-with-payloads', {
      is: WorkingWithPayloads
    });

    document.body.appendChild(element);

    const accountChangeEvent = new CustomEvent('change', {
      detail: {
        value: ['accountId'],
        payload: {
          'accountId': { name: 'Account name' }
        }
      } 
    });

    const contactChangeEvent = new CustomEvent('change', {
      detail: {
        value: ['contactId'],
        payload: {
          'contactId': { name: 'Contact Name', phone: 'Phone' }
        }
      } 
    });

    // Act
    const accountLookup = element.shadowRoot.querySelector('c-lookup[data-id="accountLookup"]');
    accountLookup.dispatchEvent(accountChangeEvent);

    const contactLookup = element.shadowRoot.querySelector('c-lookup[data-id="contactLookup"]');
    contactLookup.dispatchEvent(contactChangeEvent);

    await Promise.resolve();
    // Assert
    const selectedAccount = element.shadowRoot.querySelector('p[data-id="selectedAccount"]');
    const selectedContact = element.shadowRoot.querySelector('p[data-id="selectedContact"]');
    expect(selectedAccount.textContent).toBe('Your account selected was Account name');
    expect(selectedContact.textContent).toBe('Your contact selected was Contact Name and its phone number is Phone');
  });
});