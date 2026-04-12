import styles from './ToolTip.module.css'
export function ToolTip({ content, position = 'right' }) {
    return (
        // The container creates the context for relative positioning
        <div className={styles.tooltip_container}>
            <div className={styles.tooltip_icon}>
              {/* Simple SVG Info Icon */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
          
    
          {/* The actual tooltip box */}
          <div className={`${styles.tooltip_box} ${styles[`tooltip_${position}`]}`}>
            {content}
            {/* A small arrow to point back to the icon */}
            <span className="tooltip-arrow" />
          </div>
        </div>
    );
}