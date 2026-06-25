// Centralized brand logo. To use a real logo image everywhere, drop the file at
// client/src/assets/logo.svg (or .png), set LOGO_SRC below, and it updates in
// every place (sidebar, topbar, login, landing). Until then it renders the
// wordmark badge + "LUC CRM".
// import logoSrc from '../assets/logo.svg';
const LOGO_SRC = null; // set to logoSrc once the brand image is added

export default function Logo({ badge = 28, word = true, wordOnly = false }) {
  return (
    <span className="logo-lockup">
      {!wordOnly &&
        (LOGO_SRC ? (
          <img className="logo-img" src={LOGO_SRC} alt="LUC CRM" style={{ height: badge }} />
        ) : (
          <span className="logo-badge" style={{ width: badge, height: badge, fontSize: badge * 0.5 }}>
            L
          </span>
        ))}
      {word && <span className="logo-word">LUC CRM</span>}
    </span>
  );
}
