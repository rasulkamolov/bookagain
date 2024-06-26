// script.js

// Initialize the database (SQLite)
let db;
const request = indexedDB.open('BookInventory', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;

    // Create object stores
    const bookStore = db.createObjectStore('books', { keyPath: 'title' });
    const transactionStore = db.createObjectStore('transactions', { autoIncrement: true });
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadInventory();
    loadTodaysStats();
};

request.onerror = function(event) {
    console.error('Database error:', event.target.error);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addBookBtn').addEventListener('click', addBook);
    document.getElementById('sellBookBtn').addEventListener('click', sellBook);
    document.getElementById('filterButton').addEventListener('click', filterStatsByDate);
    document.getElementById('exportInventoryBtn').addEventListener('click', exportCurrentInventory);
    document.getElementById('exportStatsBtn').addEventListener('click', exportTodaysStatistics);
});

function loadInventory() {
    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        const inventoryTable = document.getElementById('inventoryTable').getElementsByTagName('tbody')[0];
        inventoryTable.innerHTML = '';

        books.forEach(book => {
            const row = inventoryTable.insertRow();
            row.insertCell().textContent = book.title;
            row.insertCell().textContent = book.price.toLocaleString();
            row.insertCell().textContent = book.quantity.toLocaleString();

            const editCell = row.insertCell();
            const editIcon = document.createElement('span');
            editIcon.className = 'edit-icon';
            editIcon.innerHTML = '🖉';
            editIcon.addEventListener('click', () => {
                promptForPassword(() => editInventory(book));
            });
            editCell.appendChild(editIcon);
        });
    };
}

function loadTodaysStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight for comparison
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const transaction = db.transaction(['transactions'], 'readonly');
    const objectStore = transaction.objectStore('transactions');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const transactions = event.target.result;
        const statsTable = document.getElementById('statsTable').getElementsByTagName('tbody')[0];
        statsTable.innerHTML = '';

        const filteredStats = transactions.filter(stat => {
            const statDate = new Date(stat.timestamp);
            return statDate >= today && statDate < tomorrow;
        });

        filteredStats.forEach(stat => {
            const row = statsTable.insertRow();
            row.insertCell().textContent = stat.action;
            row.insertCell().textContent = stat.book;
            row.insertCell().textContent = stat.quantity.toLocaleString();
            row.insertCell().textContent = (stat.quantity * stat.price).toLocaleString(); // Calculate total
            row.insertCell().textContent = new Date(stat.timestamp).toLocaleString(); // Format timestamp

            const editCell = row.insertCell();
            const editIcon = document.createElement('span');
            editIcon.className = 'edit-icon';
            editIcon.innerHTML = '🖉';
            editIcon.addEventListener('click', () => {
                promptForPassword(() => editStat(stat));
            });
            editCell.appendChild(editIcon);
        });
    };
}

function addBook() {
    const title = document.getElementById('bookTitle').value;
    const quantity = parseInt(document.getElementById('quantity').value, 10);

    const transaction = db.transaction(['books', 'transactions'], 'readwrite');
    const bookStore = transaction.objectStore('books');
    const transactionStore = transaction.objectStore('transactions');

    const bookRequest = bookStore.get(title);
    bookRequest.onsuccess = function(event) {
        const book = event.target.result;
        if (book) {
            book.quantity += quantity;
            bookStore.put(book);
        } else {
            const price = getBookPrice(title);
            bookStore.add({ title, price, quantity });
        }

        // Record the addition in the transactions store
        transactionStore.add({
            action: 'Added',
            book: title,
            quantity,
            price: getBookPrice(title),
            timestamp: new Date().toISOString()
        });

        loadInventory();
        loadTodaysStats();
        document.getElementById('addModal').querySelector('.btn-close').click();
    };
}

function sellBook() {
    const title = document.getElementById('sellBookTitle').value;
    const quantity = parseInt(document.getElementById('sellQuantity').value, 10);

    const transaction = db.transaction(['books', 'transactions'], 'readwrite');
    const bookStore = transaction.objectStore('books');
    const transactionStore = transaction.objectStore('transactions');

    const bookRequest = bookStore.get(title);
    bookRequest.onsuccess = function(event) {
        const book = event.target.result;
        if (!book || book.quantity < quantity) {
            alert('Not enough books in stock!');
            return;
        }

        book.quantity -= quantity;
        bookStore.put(book);

        // Record the sale in the transactions store
        transactionStore.add({
            action: 'Sold',
            book: title,
            quantity,
            price: getBookPrice(title),
            timestamp: new Date().toISOString()
        });

        loadInventory();
        loadTodaysStats();
        document.getElementById('sellModal').querySelector('.btn-close').click();
    };
}

function getBookPrice(title) {
    const prices = {
        "Beginner": 85000,
        "Elementary": 85000,
        "Pre-Intermediate": 85000,
        "Intermediate": 85000,
        "Kids Level 1": 60000,
        "Kids Level 2": 60000,
        "Kids Level 3": 60000,
        "Kids Level 4": 60000,
        "Kids Level 5": 60000,
        "Kids Level 6": 60000,
        "Kids High Level 1": 60000,
        "Kids High Level 2": 60000,
        "Listening Beginner": 30000,
        "Listening Elementary": 30000,
        "Listening Pre-Intermediate": 30000,
        "Listening Intermediate": 35000
    };
    return prices[title];
}

function filterStatsByDate() {
    const filterDate = new Date(document.getElementById('filterDate').value);
    filterDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(filterDate);
    nextDay.setDate(filterDate.getDate() + 1);

    const transaction = db.transaction(['transactions'], 'readonly');
    const objectStore = transaction.objectStore('transactions');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const transactions = event.target.result;
        const statsTable = document.getElementById('statsTable').getElementsByTagName('tbody')[0];
        statsTable.innerHTML = '';

        const filteredStats = transactions.filter(stat => {
            const statDate = new Date(stat.timestamp);
            return statDate >= filterDate && statDate < nextDay;
        });

        filteredStats.forEach(stat => {
            const row = statsTable.insertRow();
            row.insertCell().textContent = stat.action;
            row.insertCell().textContent = stat.book;
            row.insertCell().textContent = stat.quantity.toLocaleString();
            row.insertCell().textContent = (stat.quantity * stat.price).toLocaleString(); // Calculate total
            row.insertCell().textContent = new Date(stat.timestamp).toLocaleString(); // Format timestamp

            const editCell = row.insertCell();
            const editIcon = document.createElement('span');
            editIcon.className = 'edit-icon';
            editIcon.innerHTML = '🖉';
            editIcon.addEventListener('click', () => {
                promptForPassword(() => editStat(stat));
            });
            editCell.appendChild(editIcon);
        });
    };
}

function exportCurrentInventory() {
    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        const csv = 'Title,Price (UZS),Quantity\n' + books.map(book => `${book.title},${book.price.toLocaleString()},${book.quantity.toLocaleString()}`).join('\n');
        downloadCSV(csv, 'current_inventory.csv');
    };
}

function exportTodaysStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight for comparison
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const transaction = db.transaction(['transactions'], 'readonly');
    const objectStore = transaction.objectStore('transactions');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const transactions = event.target.result;
        const filteredStats = transactions.filter(stat => {
            const statDate = new Date(stat.timestamp);
            return statDate >= today && statDate < tomorrow;
        });

        const csv = 'Action,Book,Quantity,Total (UZS),Timestamp\n' + filteredStats.map(stat => `${stat.action},${stat.book},${stat.quantity.toLocaleString()},${(stat.quantity * stat.price).toLocaleString()},${new Date(stat.timestamp).toLocaleString()}`).join('\n');
        downloadCSV(csv, 'todays_statistics.csv');
    };
}

function downloadCSV(csv, filename) {
    const csvFile = new Blob([csv], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function promptForPassword(callback) {
    const password = prompt('Enter password to edit:');
    if (password === 'Rasul9898aa') {
        callback();
    } else {
        alert('Incorrect password!');
    }
}

function editInventory(book) {
    const newTitle = prompt('Enter new title:', book.title);
    const newPrice = parseInt(prompt('Enter new price:', book.price), 10);
    const newQuantity = parseInt(prompt('Enter new quantity:', book.quantity), 10);

    const transaction = db.transaction(['books'], 'readwrite');
    const bookStore = transaction.objectStore('books');
    bookStore.put({ title: newTitle, price: newPrice, quantity: newQuantity });

    loadInventory();
}

function editStat(stat) {
    const newQuantity = parseInt(prompt('Enter new quantity:', stat.quantity), 10);

    const transaction = db.transaction(['transactions'], 'readwrite');
    const transactionStore = transaction.objectStore('transactions');
    transactionStore.put({ ...stat, quantity: newQuantity });

    loadTodaysStats();
}
