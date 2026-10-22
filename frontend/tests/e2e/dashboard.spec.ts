import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "admin@e2e.local", password: "e2e-admin-password" };
const PASSWORD = "e2e-user-password";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Order pipeline" })).toBeVisible();
  await expect(page).toHaveURL(/\/orders$/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function addUser(page: Page, email: string, role: string, customerId = "") {
  await page.goto("/users");
  const form = page.locator("form", { has: page.getByRole("heading", { name: "Add user" }) });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(PASSWORD);
  await form.getByLabel("Role").selectOption(role);
  await form.getByLabel("Customer ID").fill(customerId);
  await form.getByRole("button", { name: "Add user" }).click();
  await expect(form.getByText("User added.")).toBeVisible();
}

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});

test("admin places an order through the New order form", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await page.getByRole("link", { name: "New order" }).click();
  await expect(page).toHaveURL(/\/orders\/new$/);
  await page.waitForLoadState("networkidle"); // type only after the form has hydrated
  await page.getByLabel("Customer ID").fill("CUS-1001");
  await page.getByLabel("Quantity of Organic Cotton Tee").fill("2");
  await page.getByRole("button", { name: "Create order" }).click();

  await expect(page).toHaveURL(/\/orders\/ORD-[0-9A-F]{12}$/);
  await expect(page.getByText("All items reserved. Sent to fulfillment.")).toBeVisible();

  // the order's audit trail names who placed it and what it became
  await page.getByRole("link", { name: "Activity for this order →" }).click();
  await expect(page.getByRole("status")).toContainText("Integrity check passed");
  const row = page.locator("tbody tr").first();
  await expect(row).toContainText("admin@e2e.local");
  await expect(row).toContainText("order.created");
  await expect(row).toContainText("status: fulfillment");
});

test("a rejected submit keeps what was entered", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/orders/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Customer ID").fill("CUS-1004");
  await page.getByRole("button", { name: "Create order" }).click();

  // (Next.js adds its own hidden role="alert" route announcer, so match the form's message by text)
  await expect(page.getByRole("alert").filter({ hasText: "Add a quantity" })).toHaveText("Add a quantity for at least one product.");
  await expect(page.getByLabel("Customer ID")).toHaveValue("CUS-1004");
});

test("a customer login sees only its own orders", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await addUser(page, "customer@e2e.local", "customer", "CUS-1002");
  await signOut(page);

  await signIn(page, "customer@e2e.local");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link")).toHaveText(["Orders", "Negotiations", "Inventory"]);
  const customers = await page.locator("tbody tr td:nth-child(2)").allTextContents();
  expect(customers.length).toBeGreaterThan(0);
  expect(new Set(customers)).toEqual(new Set(["CUS-1002"]));

  await page.goto("/orders/ORD-2401"); // belongs to CUS-1001
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();

  await page.goto("/orders/new");
  await expect(page.getByLabel("Customer ID")).toHaveValue("CUS-1002");
  await expect(page.getByLabel("Customer ID")).toHaveAttribute("readonly", "");
});

test("an analyst can look but not change anything", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await addUser(page, "analyst@e2e.local", "analyst");
  await signOut(page);

  await signIn(page, "analyst@e2e.local");
  await expect(page.getByRole("link", { name: "New order" })).toHaveCount(0);
  await page.goto("/audit");
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await page.goto("/users");
  await expect(page).toHaveURL(/\/orders$/);
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await signOut(page);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});
