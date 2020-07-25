import { useState } from "react";
import { NextPage } from "next";
import Router from "next/router";
import buildClient from "../../api/build-client";

interface NewTicketProps {
  currentUser: { id: string; walletAddress: string } | null;
}

const NewTicket: NextPage<NewTicketProps> = ({ currentUser }) => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div style={styles.notConnected}>
        <h2>Connect Your Wallet</h2>
        <p>You need to connect your wallet to sell tickets</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const client = buildClient();
      const { data } = await client.post("/api/tickets", {
        title,
        price: parseFloat(price),
        eventDate: eventDate || undefined,
        venue: venue || undefined,
        description: description || undefined,
      });
      Router.push(`/tickets/${data.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.[0]?.message || "Failed to create ticket"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create New Ticket</h1>

      <form onSubmit={handleSubmit} className="card" style={styles.form}>
        <div className="form-group">
          <label htmlFor="title">Event Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Concert, Sports Game, etc."
          />
        </div>

        <div style={styles.row}>
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="price">Price (ETH) *</label>
            <input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              step="0.001"
              placeholder="0.00"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="eventDate">Event Date</label>
            <input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="venue">Venue</label>
          <input
            id="venue"
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Madison Square Garden, etc."
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your event..."
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={styles.submitBtn}
        >
          {loading ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "30px",
  },
  form: {
    padding: "30px",
  },
  row: {
    display: "flex",
    gap: "20px",
  },
  submitBtn: {
    width: "100%",
    padding: "15px",
    fontSize: "16px",
    marginTop: "10px",
  },
  notConnected: {
    textAlign: "center",
    padding: "60px 20px",
  },
};

export default NewTicket;
