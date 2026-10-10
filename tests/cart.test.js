const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const testDb = require("./testDb");

let app;
let User;
let Category;
let Product;
let Cart;

beforeAll(async () => {
  await testDb.connect();

  app = require("../app");
  User = require("../models/User");
  Category = require("../models/Category");
  Product = require("../models/Product");
  Cart = require("../models/Cart");
});

afterAll(async () => {
  await testDb.disconnect();
});

afterEach(async () => {
  await testDb.clearDatabase();
});

async function createUserAndProduct() {
  const user = await User.create({
    name: "Cart Test User",
    email: "cart-test@example.com",
    password: await bcrypt.hash("Password1!", 4),
    is_verified: true,
  });
  const category = await Category.create({ name: "Cart Test Category" });
  const product = await Product.create({
    name: "Cart Test Product",
    description: "Product used by the cart API test",
    price: 10,
    stock: 10,
    category_id: category._id,
    brand: "Test",
    image: "test.png",
  });
  const token = jwt.sign(
    { id: user._id.toString(), sessionVersion: user.sessionVersion },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { user, product, token };
}

describe("Add to cart", () => {
  test("accepts a form-encoded quantity and saves the item for the JWT user", async () => {
    const { user, product, token } = await createUserAndProduct();

    const response = await request(app)
      .post("/cart/add")
      .set("Cookie", `jwt=${token}`)
      .type("form")
      .send({ productId: product._id.toString(), quantity: "2" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.cart.user.toString()).toBe(user._id.toString());
    expect(response.body.cart.items).toHaveLength(1);
    expect(response.body.cart.items[0].quantity).toBe(2);

    const savedCart = await Cart.findOne({ user: user._id });
    expect(savedCart.items[0].product.toString()).toBe(product._id.toString());
    expect(savedCart.items[0].quantity).toBe(2);
  });

  test("requires a valid JWT cookie", async () => {
    const { product } = await createUserAndProduct();

    const response = await request(app)
      .post("/cart/add")
      .send({ productId: product._id.toString(), quantity: 1 });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(await Cart.countDocuments()).toBe(0);
  });

  test("rejects invalid quantities and product IDs", async () => {
    const { product, token } = await createUserAndProduct();

    const invalidQuantityResponse = await request(app)
      .post("/cart/add")
      .set("Cookie", `jwt=${token}`)
      .send({ productId: product._id.toString(), quantity: 1.5 });
    expect(invalidQuantityResponse.status).toBe(400);

    const invalidProductResponse = await request(app)
      .post("/cart/add")
      .set("Cookie", `jwt=${token}`)
      .send({ productId: "not-an-object-id", quantity: 1 });
    expect(invalidProductResponse.status).toBe(400);
    expect(await Cart.countDocuments()).toBe(0);
  });
});
