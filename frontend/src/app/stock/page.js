"use client";
import { useEffect, useState } from "react";

export default function StockPage() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/stock")
      .then((res) => res.json())
      .then((data) => {
        setStock(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading stock...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Stock</h1>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Stock ID</th>
            <th>Product ID</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.product_id}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
