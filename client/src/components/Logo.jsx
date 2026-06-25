// Centralized brand logo (the official LUC lockup). `onDark` swaps to the
// white-wordmark variant so it stays visible on the dark teal rail / panels.
import logo from '../assets/logo.svg';
import logoLight from '../assets/logo-light.svg';

export default function Logo({ width = 150, onDark = false, className = '', style }) {
  return (
    <img
      className={`logo-img ${className}`}
      src={onDark ? logoLight : logo}
      alt="Learners University College"
      style={{ width, height: 'auto', display: 'block', ...style }}
    />
  );
}
