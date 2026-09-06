import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <div className="animate-fade-in">
      <Component {...pageProps} />
    </div>
  );
}
