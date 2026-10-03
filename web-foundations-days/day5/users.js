const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];
let hasLoadedUsers = false;
let isLoading = false;

function renderUsers(usersToRender) {
  usersList.replaceChildren();

  usersToRender.forEach((user) => {
    const item = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    item.append(name, email, city, company);
    usersList.append(item);
  });
}

async function loadUsers() {
  isLoading = true;
  loadButton.disabled = true;
  status.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The server returned invalid user data.");
    }

    users = data;
    hasLoadedUsers = true;
    isLoading = false;
    renderUsers(users);
    status.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    hasLoadedUsers = false;
    status.textContent = `Unable to load users: ${error.message}`;
  } finally {
    isLoading = false;
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", () => {
  const query = filterInput.value.trim().toLowerCase();
  const matchingUsers = users.filter((user) =>
    user.name.toLowerCase().includes(query),
  );

  renderUsers(matchingUsers);

  if (hasLoadedUsers && !isLoading) {
    status.textContent =
      matchingUsers.length === 0
        ? "No users match your search."
        : query === ""
          ? `Loaded ${users.length} users.`
          : `Showing ${matchingUsers.length} of ${users.length} users.`;
  }
});
