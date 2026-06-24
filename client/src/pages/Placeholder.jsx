import Topbar from '../components/Topbar.jsx';

// Temporary screen for routes built in later milestones (Reports M6, Flow/
// Automation M7). Keeps navigation working with no dead ends.
export default function Placeholder({ title, milestone }) {
  return (
    <>
      <Topbar title={title} subtitle={`Arrives in ${milestone}`} />
      <div className="content">
        <div className="empty">{title} is implemented in {milestone}.</div>
      </div>
    </>
  );
}
