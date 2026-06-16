/** Reusable mesh blobs + pixel grid background */
const MeshBackground = ({ showGrid = true, className = '' }) => (
  <div className={`mesh-bg ${className}`} aria-hidden="true">
    <div className="mesh-blob mesh-blob-1" />
    <div className="mesh-blob mesh-blob-2" />
    <div className="mesh-blob mesh-blob-3" />
    {showGrid && <div className="pixel-grid" />}
  </div>
)

export default MeshBackground
