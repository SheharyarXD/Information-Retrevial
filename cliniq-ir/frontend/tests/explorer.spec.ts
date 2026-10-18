import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, clinic = "north") {
  await page.goto("/");
  if (clinic === "river")
    await page.getByRole("button", { name: "Riverside Clinic" }).click();
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Clinical Records Explorer." }),
  ).toBeVisible();
}

test("complete guided journey, preview, related links, breadcrumbs, refresh, back and forward", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(page.locator(".records-table tbody tr")).toHaveCount(5);
  await page.screenshot({
    path: "test-results/desktop-explorer.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Start with a patient/ }).click();
  await page.getByRole("link", { name: /Amina Rahman/ }).click();
  await expect(
    page.getByRole("heading", { name: "Encounter history" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /E-1001.*Recurring headache/ }).click();
  await expect(page.getByRole("status")).toContainText("5 records");
  await page.getByRole("link", { name: /Consultation Notes/ }).click();
  await expect(page.getByRole("status")).toContainText("1 record");
  await page
    .getByRole("link", { name: "Headache consultation note", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Headache consultation note",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Documented discussion" }),
  ).toBeVisible();
  await page
    .getByRole("complementary", { name: "Related documents" })
    .getByRole("link", { name: /Headache — pre-consultation intake/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Headache — pre-consultation intake" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Headache — pre-consultation intake" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "Headache consultation note",
      exact: true,
    }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Headache — pre-consultation intake" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "E-1001", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recurring headache", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("keyword search, filters, no results, pagination, and persisted route state", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("searchbox").fill("  HeAdAcHe  ");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("4 records matched");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("consultation");
  await expect(page.getByRole("status")).toContainText("1 record matched");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("1 record matched");
  await page.getByRole("searchbox").fill("noexistingsampleword");
  await expect(
    page.getByRole("heading", { name: "No matching records" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toContainText("23 records");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await page.getByLabel("Sort by").selectOption("title");
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
});

test("empty category, empty patient, empty encounter, and invalid hierarchy", async ({
  page,
}) => {
  await login(page);
  await page.goto("/records?category=other");
  await expect(
    page.getByRole("heading", { name: "No documents in this category" }),
  ).toBeVisible();
  await page.goto("/patients/P-1007");
  await expect(
    page.getByRole("heading", { name: "No encounters recorded" }),
  ).toBeVisible();
  await page.goto("/patients/P-1006/encounters/E-1008");
  await expect(
    page.getByRole("heading", { name: "No clinical documents yet" }),
  ).toBeVisible();
  await page.goto("/patients/P-1002/encounters/E-1001/records/1");
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(
    page.getByText("Medical background", { exact: true }),
  ).not.toBeVisible();
});

test("clinic isolation, direct URL authorization, related empty state and sign out", async ({
  page,
}) => {
  await login(page);
  await page.goto("/records?q=riverstone");
  await expect(
    page.getByRole("heading", { name: "No matching records" }),
  ).toBeVisible();
  await page.goto("/patients/P-2001/encounters/E-2001/records/24");
  await expect(page.getByRole("alert")).toContainText("Record unavailable");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to ClinIQ" }),
  ).toBeVisible();
  await login(page, "river");
  await page.goto("/patients/P-2002/encounters/E-2002/records/26");
  await expect(
    page.getByRole("heading", { name: "No related documents" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/patients/P-2002/encounters/E-2002/records/26");
  await expect(
    page.getByRole("heading", { name: "Welcome to ClinIQ" }),
  ).toBeVisible();
});

test("small-screen navigation and keyboard-accessible sign in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Clinical Records Explorer." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Patient Directory" }).click();
  await expect(
    page.getByRole("heading", { name: "Patient directory" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Workspace navigation" }),
  ).not.toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-directory.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("loading and network error states offer a working retry", async ({
  page,
}) => {
  await login(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/records?*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/records");
  await expect(page.getByRole("status")).toContainText("Loading clinical records");
  release();
  await expect(page.getByRole("status")).toContainText("23 records");
  await page.unroute("**/api/records?*");
  await page.route("**/api/records?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Temporary test outage." }),
    }),
  );
  await page.goto("/records");
  await expect(page.getByRole("alert")).toContainText("Temporary test outage");
  await page.unroute("**/api/records?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("status")).toContainText("23 records");
});
