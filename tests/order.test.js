const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const testDb = require("./testDb");

let app;
let User;
let Category;
let Product;
let Cart;
let Address;
let Order;

beforeAll(async () => {
  await testDb.connect();

  app = require("../app");
  User = require("../models/userModel");
  Category = require("../models/categoryModel");
  Product = require("../models/productModel");
  Cart = require("../models/cartModel");
  Address = require("../models/addressModel");
  Order = require("../models/orderModel");
});

afterAll(async () => {
  await testDb.disconnect();
});

afterEach(async () => {
  await testDb.clearDatabase();
});

async function createUser(role = "user") {
  const user = await User.create({
    name: "Order Test User",
    email: `${role}-${Date.now()}-${Math.random()}@example.com`,
    password: await bcrypt.hash("Password1!", 4),
    role,
    is_verified: true,
  });
  const token = jwt.sign(
    { id: user._id.toString(), sessionVersion: user.sessionVersion },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return { user, token };
}

async function createAddress(user) {
  return Address.create({
    user: user._id,
    fullName: "Order Test Customer",
    phone: "9876543210",
    addressLine1: "1 Test Street",
    addressLine2: "Apt 2",
    city: "Test City",
    state: "Test State",
    postalCode: "123456",
    country: "India",
  });
}

async function createProductAndCart(user, options = {}) {
  const category = await Category.create({
    name: `Category-${Date.now()}-${Math.random()}`,
  });
  const product = await Product.create({
    name: "Order Test Product",
    description: "Product used by order API tests",
    price: options.price ?? 12.5,
    stock: options.stock ?? 10,
    category_id: category._id,
    brand: "Test",
    image: "test.png",
    is_active: options.isActive ?? true,
  });
  const cart = await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: options.quantity ?? 2 }],
  });
  return { product, cart };
}

const authenticated = (method, path, token) =>
  request(app)[method](path).set("Cookie", `jwt=${token}`);

describe("Order placement", () => {
  test("creates a COD order from trusted product data and clears the user's cart", async () => {
    const { user, token } = await createUser();
    const address = await createAddress(user);
    const { product, cart } = await createProductAndCart(user);

    const response = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
      totalAmount: 0.01,
      paymentStatus: "Paid",
      orderStatus: "Delivered",
      items: [{ product: product._id, price: 0.01, quantity: 100 }],
    });

    expect(response.status).toBe(201);
    expect(response.body.order.items).toEqual([
      expect.objectContaining({
        product: product._id.toString(),
        name: product.name,
        price: 12.5,
        quantity: 2,
      }),
    ]);
    expect(response.body.order.subtotal).toBe(25);
    expect(response.body.order.totalAmount).toBe(25);
    expect(response.body.order.paymentStatus).toBe("Pending");
    expect(response.body.order.orderStatus).toBe("Placed");
    expect(response.body.order.shippingAddress.fullName).toBe(address.fullName);

    const savedCart = await Cart.findById(cart._id);
    expect(savedCart.items).toHaveLength(0);
    expect((await Product.findById(product._id)).stock).toBe(8);
    expect(await Order.countDocuments({ user: user._id })).toBe(1);
  });

  test("requires authentication", async () => {
    const response = await request(app).post("/orders").send({});
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("rejects empty carts, invalid address IDs, and unsupported payment methods", async () => {
    const { user, token } = await createUser();
    const address = await createAddress(user);

    const emptyCartResponse = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });
    expect(emptyCartResponse.status).toBe(400);

    const invalidAddressResponse = await authenticated("post", "/orders", token).send({
      addressId: "not-an-object-id",
      paymentMethod: "COD",
    });
    expect(invalidAddressResponse.status).toBe(400);

    const invalidMethodResponse = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "Online",
    });
    expect(invalidMethodResponse.status).toBe(400);
  });

  test("does not allow using another user's shipping address", async () => {
    const { user, token } = await createUser();
    const { user: otherUser } = await createUser();
    const address = await createAddress(otherUser);
    await createProductAndCart(user);

    const response = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });

    expect(response.status).toBe(404);
    expect(await Order.countDocuments()).toBe(0);
  });

  test("rejects invalid quantities and unavailable or deleted products", async () => {
    const { user, token } = await createUser();
    const address = await createAddress(user);
    const { product, cart } = await createProductAndCart(user);

    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { "items.0.quantity": 0 } }
    );
    const invalidQuantityResponse = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });
    expect(invalidQuantityResponse.status).toBe(400);

    await Cart.collection.updateOne(
      { _id: cart._id },
      { $set: { "items.0.quantity": 2 } }
    );
    await Product.findByIdAndUpdate(product._id, { is_active: false });
    const inactiveProductResponse = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });
    expect(inactiveProductResponse.status).toBe(400);

    await Product.findByIdAndDelete(product._id);
    const deletedProductResponse = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });
    expect(deletedProductResponse.status).toBe(400);
  });

  test("rejects an order that exceeds available stock without changing inventory", async () => {
    const { user, token } = await createUser();
    const address = await createAddress(user);
    const { product } = await createProductAndCart(user, { stock: 1, quantity: 2 });

    const response = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });

    expect(response.status).toBe(400);
    expect((await Product.findById(product._id)).stock).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
  });

  test("rolls back the order and stock if clearing the cart fails", async () => {
    const { user, token } = await createUser();
    const address = await createAddress(user);
    const { product, cart } = await createProductAndCart(user);
    const save = jest.spyOn(Cart.prototype, "save").mockImplementation(function () {
      if (this.items.length === 0) {
        return Promise.reject(new Error("Simulated cart clear failure"));
      }
      return Promise.resolve(this);
    });

    try {
      const response = await authenticated("post", "/orders", token).send({
        addressId: address._id.toString(),
        paymentMethod: "COD",
      });

      expect(response.status).toBe(500);
      expect(await Order.countDocuments()).toBe(0);
      expect((await Product.findById(product._id)).stock).toBe(10);
      expect((await Cart.findById(cart._id)).items).toHaveLength(1);
    } finally {
      save.mockRestore();
    }
  });
});

describe("Order access and cancellation", () => {
  test("lists only the logged-in user's orders and hides orders owned by others", async () => {
    const first = await createUser();
    const second = await createUser();
    const address = await createAddress(first.user);
    await createProductAndCart(first.user);
    const orderResponse = await authenticated("post", "/orders", first.token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });

    const ownOrders = await authenticated("get", "/orders", first.token);
    expect(ownOrders.status).toBe(200);
    expect(ownOrders.body.orders).toHaveLength(1);

    const ownDetails = await authenticated(
      "get",
      `/orders/${orderResponse.body.order._id}`,
      first.token
    );
    expect(ownDetails.status).toBe(200);
    expect(ownDetails.body.order._id).toBe(orderResponse.body.order._id);

    const foreignDetails = await authenticated(
      "get",
      `/orders/${orderResponse.body.order._id}`,
      second.token
    );
    expect(foreignDetails.status).toBe(404);

    const invalidDetails = await authenticated("get", "/orders/not-an-id", first.token);
    expect(invalidDetails.status).toBe(400);
  });

  test("cancels eligible orders and rejects delivered orders", async () => {
    const { user, token } = await createUser();
    const address = await createAddress(user);
    const { product } = await createProductAndCart(user);
    const response = await authenticated("post", "/orders", token).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });
    const orderId = response.body.order._id;

    const cancelled = await authenticated(
      "patch",
      `/orders/${orderId}/cancel`,
      token
    );
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.orderStatus).toBe("Cancelled");
    expect(cancelled.body.order.paymentStatus).toBe("Pending");
    expect((await Product.findById(product._id)).stock).toBe(10);

    const deliveredOrder = await Order.create({
      user: user._id,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          name: "Item",
          price: 1,
          quantity: 1,
        },
      ],
      shippingAddress: response.body.order.shippingAddress,
      subtotal: 1,
      totalAmount: 1,
      paymentMethod: "COD",
      orderStatus: "Delivered",
    });
    const rejected = await authenticated(
      "patch",
      `/orders/${deliveredOrder._id}/cancel`,
      token
    );
    expect(rejected.status).toBe(409);
  });
});

describe("Admin order management", () => {
  test("restricts admin APIs and enforces status transitions", async () => {
    const regularUser = await createUser();
    const admin = await createUser("admin");
    const address = await createAddress(regularUser.user);
    await createProductAndCart(regularUser.user);
    const placeResponse = await authenticated(
      "post",
      "/orders",
      regularUser.token
    ).send({
      addressId: address._id.toString(),
      paymentMethod: "COD",
    });
    const orderId = placeResponse.body.order._id;

    const forbiddenList = await authenticated("get", "/orders/admin/all", regularUser.token);
    expect(forbiddenList.status).toBe(403);

    const invalidStatus = await authenticated(
      "patch",
      `/orders/admin/${orderId}/status`,
      admin.token
    ).send({ orderStatus: "Paid" });
    expect(invalidStatus.status).toBe(400);

    const confirmed = await authenticated(
      "patch",
      `/orders/admin/${orderId}/status`,
      admin.token
    ).send({ orderStatus: "Confirmed", paymentStatus: "Paid" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.order.orderStatus).toBe("Confirmed");
    expect(confirmed.body.order.paymentStatus).toBe("Pending");

    const skippedTransition = await authenticated(
      "patch",
      `/orders/admin/${orderId}/status`,
      admin.token
    ).send({ orderStatus: "Delivered" });
    expect(skippedTransition.status).toBe(409);

    const adminOrders = await authenticated("get", "/orders/admin/all", admin.token)
      .query({ page: 1, limit: 1 });
    expect(adminOrders.status).toBe(200);
    expect(adminOrders.body.orders).toHaveLength(1);
    expect(adminOrders.body.total).toBe(1);
  });
});
