import json

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import math

def display_rectangles(rectangles):
    """
    Display rectangles on a graph.
    
    Args:
        rectangles: List of dictionaries, each containing:
            - x, y: coordinates of the center
            - width, height: dimensions of the rectangle
            - rotation: rotation angle in degrees
    """
    # Create figure and axis
    fig, ax = plt.subplots(figsize=(10, 10))
    
    # Set equal aspect ratio
    ax.set_aspect('equal')

    # Track min/max coordinates to set proper axis limits
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')

    # Plot each rectangle
    for rect in rectangles:
        x, y = rect['x'], rect['y']
        width, height = rect['width'], rect['height']
        angle_deg = rect['rotation']
        angle_rad = math.radians(angle_deg)

        # Create a rectangle centered at origin
        rect_points = np.array([
            [-width / 2, -height / 2],
            [width / 2, -height / 2],
            [width / 2, height / 2],
            [-width / 2, height / 2]
        ])

        # Rotation matrix
        rotation_matrix = np.array([
            [math.cos(angle_rad), -math.sin(angle_rad)],
            [math.sin(angle_rad), math.cos(angle_rad)]
        ])

        # Rotate rectangle points
        rotated_points = np.dot(rect_points, rotation_matrix.T)

        # Translate rectangle to center position
        final_points = rotated_points + np.array([x, y])

        # Draw the rectangle
        polygon = patches.Polygon(final_points, closed=True,
                                  edgecolor='none',  # blue
                                  facecolor=facecolor,  # lightblue
                                  alpha=0.05)  # 0.5
        ax.add_patch(polygon)

        # Mark the center point
        # ax.plot(x, y, 'ro', markersize=4)

        # Update min/max coordinates
        rect_min_x = final_points[:, 0].min()
        rect_max_x = final_points[:, 0].max()
        rect_min_y = final_points[:, 1].min()
        rect_max_y = final_points[:, 1].max()

        min_x = min(min_x, rect_min_x)
        max_x = max(max_x, rect_max_x)
        min_y = min(min_y, rect_min_y)
        max_y = max(max_y, rect_max_y)

    # Add some padding to the plot
    padding = max(max_x - min_x, max_y - min_y) * 0.1
    ax.set_xlim(min_x - padding, max_x + padding)
    ax.set_ylim(min_y - padding, max_y + padding)
    
    # Add grid and labels
    ax.grid(True, linestyle='--', alpha=0.7)
    ax.set_xlabel('RA (degrees)')
    ax.set_ylabel('DEC (degrees)')
    plt.title('FITS File Coordinates')

    plt.show()
    
    return fig, ax

# Example usage
if __name__ == "__main__":
    # Example list of rectangles
    rectangles = [
        {'x': 0, 'y': 0, 'width': 4, 'height': 2, 'rotation': 0},
        {'x': 5, 'y': 5, 'width': 3, 'height': 3, 'rotation': 45},
        {'x': -3, 'y': 4, 'width': 2, 'height': 5, 'rotation': 30},
        {'x': -5, 'y': -2, 'width': 4, 'height': 1, 'rotation': 15}
    ]

    display_rectangles(rectangles)