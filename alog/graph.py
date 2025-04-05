import matplotlib.pyplot as plt
import matplotlib.patches as patches
import math

def display_rectangles(rectangles):
    """
    Displays a list of rectangles on a graph.
    
    Args:
        rectangles (list of dict): A list of rectangles where each is described as:
            {
                'x': center_x (float),
                'y': center_y (float),
                'width': width (float),
                'height': height (float),
                'rotation': rotation_in_degrees (float)
            }
    """
    fig, ax = plt.subplots()

    for rect in rectangles:
        center_x = rect['x']
        center_y = rect['y']
        width = rect['width']
        height = rect['height']
        rotation = rect['rotation']
        
        # Create a rectangle patch
        rectangle = patches.Rectangle(
            (center_x - width / 2, center_y - height / 2),  # Bottom-left from center
            width,
            height,
            angle=rotation,
            edgecolor='blue',
            facecolor='none'  # Transparent fill
        )
        
        # Add the rectangle to the plot
        ax.add_patch(rectangle)
        
        # Optionally, mark the center of the rectangle
        ax.plot(center_x, center_y, 'ro')  # Red dot
    
    # Set axis limits to make sure all rectangles are visible
    all_x = [rect['x'] for rect in rectangles]
    all_y = [rect['y'] for rect in rectangles]
    max_width = max(rect['width'] for rect in rectangles)
    max_height = max(rect['height'] for rect in rectangles)
    
    ax.set_xlim(min(all_x) - max_width, max(all_x) + max_width)
    ax.set_ylim(min(all_y) - max_height, max(all_y) + max_height)
    
    ax.set_aspect('equal', adjustable='datalim')
    plt.grid()
    plt.show()


# Example usage
rectangles = [
    {'x': 2, 'y': 3, 'width': 4, 'height': 2, 'rotation': 0},
    {'x': 5, 'y': 6, 'width': 6, 'height': 3, 'rotation': 45},
    {'x': 0, 'y': 0, 'width': 2, 'height': 2, 'rotation': 30},
]

display_rectangles(rectangles)