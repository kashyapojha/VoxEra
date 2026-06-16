const PageHeader = ({ title, description, live = false, children }) => (
  <div className="page-header mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      {live && (
        <div className="flex items-center gap-2 mb-2">
          <span className="live-dot" />
          <span className="text-xs font-mono uppercase tracking-widest text-accent-mint">Live monitoring</span>
        </div>
      )}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {children}
  </div>
)

export default PageHeader
