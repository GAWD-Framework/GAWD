import styles from './NodeSelectMenu.module.css';

export function NodeSelectMenu() {
  const onDragStart = (event, nodeType) => {
    // Attach the node type to the drag event
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={styles.maindiv}>
      <h1>Add a node</h1>
      
        {/* Draggable Agent Node */}
        <div className={styles.agent_hex_border}
        onDragStart={(event) => onDragStart(event, 'agent')}
        draggable
        >
            <div className={styles.agent_hex_inner}>
                <div>Agent</div>
            </div>
        </div>

      <div
        className={styles.router_div}
        onDragStart={(event) => onDragStart(event, 'router')}
        draggable
      >
        Router
      </div>

      <div
        className={styles.function_div}
        onDragStart={(event) => onDragStart(event, 'function')}
        draggable
      >
        Action
      </div>

      <div
        className={styles.end_div}
        onDragStart={(event) => onDragStart(event, 'end')}
        draggable
      >
        <div className={styles.end_name}>End</div>
      </div>
    </div>
  );
}