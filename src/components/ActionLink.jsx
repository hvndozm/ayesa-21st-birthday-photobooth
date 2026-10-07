import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export default function ActionLink({
  to, children, variant = 'primary', icon, arrow = false, className = '', ...props
}) {
  return (
    <Link to={to} className={`button button--${variant} ${className}`} {...props}>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
      {arrow && <Icon name="arrow" className="button-arrow" />}
    </Link>
  )
}
