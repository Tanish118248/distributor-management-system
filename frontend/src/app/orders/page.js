"use client";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = () => {
    fetch("http://127.0.0.1:8000/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
    fetch("http://127.0.0.1:8000/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const response = await fetch("http://127.0.0.1:8000/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customerName,
        items: [{ product_id: parseInt(productId), quantity: parseInt(quantity) }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      setMessage("Error: " + data.error);
    } else {
      setMessage("Order created successfully!");
      setCustomerName("");
      setProductId("");
      setQuantity("");
      loadOrders();
    }
  };

  if (loading) return <p>Loading orders...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Create Order</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div>
          <label>Customer Name: </label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Product: </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">-- Select a product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Quantity: </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <button type="submit">Create Order</button>
      </form>

      {message && <p>{message}</p>}

      <h1>Orders</h1>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer_name}</td>
              <td>{order.status}</td>
              <td>{order.order_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}