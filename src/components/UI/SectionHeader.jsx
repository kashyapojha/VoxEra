const SectionHeader = ({ tag, title, description, className = '' }) => (
  <div className={`mb-10 ${className}`}>
    {tag && <div className="section-tag">{tag}</div>}
    {title && <h2 className="section-heading">{title}</h2>}
    {description && <p className="section-desc">{description}</p>}
  </div>
)

export default SectionHeader
