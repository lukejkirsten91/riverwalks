import streamlit as st
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

st.set_page_config(page_title="River Measurement Visualization", layout="wide")

st.title("River Measurement Visualization App")
st.subheader("GCSE Geography River Study Tool")

# Session state initialization
if 'num_points' not in st.session_state:
    st.session_state.num_points = 0
if 'point_data' not in st.session_state:
    st.session_state.point_data = {}

# Input for number of measurement sites
num_points = st.number_input("How many sites along the river did you measure?", 
                            min_value=0, max_value=20, value=st.session_state.num_points, step=1)

# Only update session state if the value actually changed
if num_points != st.session_state.num_points:
    # Store old value to check if it changed
    old_num_points = st.session_state.num_points
    
    # Update session state
    st.session_state.num_points = num_points
    
    # Reset data if number of points changes
    if old_num_points != num_points:
        st.session_state.point_data = {}
        st.rerun()

# If we have points to measure
if st.session_state.num_points > 0:
    tabs = st.tabs([f"Site {i+1}" for i in range(st.session_state.num_points)] + ["Visualization"])
    
    # Create input fields for each point
    for i, tab in enumerate(tabs[:-1]):  # All tabs except the last one
        with tab:
            st.header(f"Site {i+1} Measurements")
            
            # Initialize this point in session state if needed
            if i not in st.session_state.point_data:
                st.session_state.point_data[i] = {
                    "width": 1.0,  # Start with a reasonable default
                    "num_measurements": 3,  # Start with a reasonable default
                    "point_name": f"Site {i+1}",  # Default name
                    "distances": [],
                    "depths": []
                }
                
            # Allow naming the site
            point_name = st.text_input(
                f"Name for site {i+1} (e.g., Upstream, Meander, etc.)",
                value=st.session_state.point_data[i].get("point_name", f"Site {i+1}"),
                key=f"name_{i}"
            )
            st.session_state.point_data[i]["point_name"] = point_name
            
            # Input for river width at this site
            width = st.number_input(
                f"Width of river at site {i+1} (meters)",
                min_value=0.1, value=float(st.session_state.point_data[i].get("width", 1.0)), 
                step=0.1, key=f"width_{i}"
            )
            
            # Input for number of depth measurements across this site
            num_measurements = st.number_input(
                f"Number of depth measurements across site {i+1}",
                min_value=2, max_value=20, value=int(st.session_state.point_data[i].get("num_measurements", 3)), 
                step=1, key=f"num_{i}"
            )
            
            # Check if values changed
            width_changed = width != st.session_state.point_data[i].get("width")
            measurements_changed = num_measurements != st.session_state.point_data[i].get("num_measurements")
            
            # Update session state
            if width_changed or measurements_changed:
                # Update values in session state
                st.session_state.point_data[i]["width"] = width
                st.session_state.point_data[i]["num_measurements"] = num_measurements
                
                # Only reset the arrays if the number of measurements changed
                if measurements_changed:
                    st.session_state.point_data[i]["distances"] = []
                    st.session_state.point_data[i]["depths"] = []
                    st.rerun()
            
            # Create input fields for each measurement
            if num_measurements > 0:
                cols = st.columns(2)
                
                with cols[0]:
                    st.subheader("Distance from Bank (m)")
                    distances = []
                    
                    # Pre-populate with evenly spaced values as defaults
                    default_distances = np.linspace(0, width, num_measurements)
                    
                    for j in range(num_measurements):
                        default_val = default_distances[j]
                        if j < len(st.session_state.point_data[i].get("distances", [])):
                            default_val = st.session_state.point_data[i]["distances"][j]
                            
                        distance = st.number_input(
                            f"Distance {j+1}",
                            min_value=0.0, max_value=float(width), 
                            value=float(default_val),
                            step=0.1, key=f"dist_{i}_{j}"
                        )
                        distances.append(distance)
                    
                with cols[1]:
                    st.subheader("Depth (m)")
                    depths = []
                    for j in range(num_measurements):
                        default_val = 0.0
                        if j < len(st.session_state.point_data[i].get("depths", [])):
                            default_val = st.session_state.point_data[i]["depths"][j]
                            
                        depth = st.number_input(
                            f"Depth {j+1}",
                            min_value=0.0, max_value=10.0, 
                            value=float(default_val),
                            step=0.1, key=f"depth_{i}_{j}"
                        )
                        depths.append(depth)
                
                # Update session state
                st.session_state.point_data[i]["distances"] = distances
                st.session_state.point_data[i]["depths"] = depths
                
                # Show cross-section visualization for this point
                st.subheader("Cross-Section Preview")
                
                fig = go.Figure()
                
                # Add river banks (brown areas on both sides)
                # Left bank
                fig.add_trace(go.Scatter(
                    x=[-0.5, 0],
                    y=[0.5, 0],
                    mode='lines',
                    fill='tozeroy',
                    line=dict(color='brown', width=0),
                    fillcolor='peru',
                    name='Left Bank'
                ))
                
                # Right bank
                fig.add_trace(go.Scatter(
                    x=[width, width+0.5],
                    y=[0, 0.5],
                    mode='lines',
                    fill='tozeroy',
                    line=dict(color='brown', width=0),
                    fillcolor='peru',
                    name='Right Bank'
                ))
                
                # Show depth going downward (negative values for visual representation)
                fig.add_trace(go.Scatter(
                    x=distances,
                    y=[-d for d in depths],  # Convert to negative so it shows downward
                    mode='lines+markers',
                    fill='tozeroy',
                    line=dict(color='royalblue', width=2),
                    marker=dict(size=8, color='darkblue', symbol='circle'),
                    name='River Bed'
                ))
                
                # Add water surface line
                fig.add_trace(go.Scatter(
                    x=[0, width],
                    y=[0, 0],
                    mode='lines',
                    line=dict(color='lightblue', width=2),
                    name='Water Surface'
                ))
                
                # Add measurement point labels
                for j, (dist, depth) in enumerate(zip(distances, depths)):
                    fig.add_annotation(
                        x=dist,
                        y=-depth - 0.1,  # Position label below the point
                        text=f"{depth}m",
                        showarrow=False,
                        yshift=-10,
                        font=dict(size=10)
                    )
                
                # Add width indicator line above the river
                fig.add_shape(
                    type="line",
                    x0=0, y0=0.2,
                    x1=width, y1=0.2,
                    line=dict(color="black", width=2)
                )
                
                # Add small vertical lines at the ends of the width line
                fig.add_shape(
                    type="line",
                    x0=0, y0=0.2,
                    x1=0, y1=0.1,
                    line=dict(color="black", width=2)
                )
                
                fig.add_shape(
                    type="line",
                    x0=width, y0=0.2,
                    x1=width, y1=0.1,
                    line=dict(color="black", width=2)
                )
                
                # Add width label
                fig.add_annotation(
                    x=width/2,
                    y=0.3,
                    text=f"{width}m",
                    showarrow=False,
                    font=dict(size=10)
                )
                
                fig.update_layout(
                    title=f"River Cross-Section at {point_name}",
                    xaxis_title="Distance from Bank (m)",
                    yaxis_title="Depth (m)",
                    yaxis=dict(autorange=True),  # Allow negative values to show below zero
                    height=400,
                    plot_bgcolor='lightcyan',  # Light blue background for water
                    xaxis=dict(range=[-0.5, width+0.5]),  # Extend x-axis to show banks
                )
                
                st.plotly_chart(fig, use_container_width=True)
    
    # Visualization tab
    with tabs[-1]:
        st.header("River Measurement Visualization")
        
        if all(len(st.session_state.point_data[i]["depths"]) > 0 for i in range(st.session_state.num_points)):
            # Get the maximum width and depth across all points
            max_width = max(st.session_state.point_data[i]["width"] for i in range(st.session_state.num_points))
            max_depth_overall = max(max(st.session_state.point_data[i]["depths"]) for i in range(st.session_state.num_points))
            
            # Create 3D visualization
            st.subheader("3D River Profile")
            
            # Create a new 3D figure
            fig = go.Figure()
            
            # First, let's create a connected river surface
            all_sites = st.session_state.num_points
            
            # Parameters for ground/bank visualization
            bank_extension = max_width * 0.5  # Extend banks 50% of max river width
            bank_height = 0.5  # Height of banks above water
            
            # Create connected river surface using all sites
            if all_sites >= 2:
                # Prepare data for continuous river bed surface
                num_interp_points = 30  # Number of interpolation points across width
                
                # Create the river bed surface
                river_x_all = []
                river_y_all = []
                river_z_all = []
                
                for i in range(all_sites):
                    point_data = st.session_state.point_data[i]
                    point_width = point_data["width"]
                    x_vals = np.array(point_data["distances"])
                    depths = np.array(point_data["depths"])
                    
                    # Create interpolated points across this section
                    x_interp = np.linspace(0, point_width, num_interp_points)
                    
                    if len(x_vals) >= 2:
                        from scipy.interpolate import interp1d
                        kind = 'cubic' if len(x_vals) > 3 else 'linear'
                        interpolator = interp1d(x_vals, depths, kind=kind, 
                                               bounds_error=False, fill_value="extrapolate")
                        z_interp = -interpolator(x_interp)
                    else:
                        z_interp = [-depths[0]] * num_interp_points
                    
                    river_x_all.append(x_interp)
                    river_y_all.append([i] * num_interp_points)
                    river_z_all.append(z_interp)
                
                # Create mesh for river bed
                X_river = np.array(river_x_all)
                Y_river = np.array(river_y_all)
                Z_river = np.array(river_z_all)
                
                # Add the river bed surface
                fig.add_trace(go.Surface(
                    x=X_river,
                    y=Y_river,
                    z=Z_river,
                    colorscale=[
                        [0, 'rgb(0, 0, 139)'],    # Dark blue for deepest parts
                        [0.3, 'rgb(30, 144, 255)'],  # Dodger blue
                        [0.6, 'rgb(65, 105, 225)'],  # Royal blue
                        [0.8, 'rgb(100, 149, 237)'],  # Cornflower blue
                        [1, 'rgb(135, 206, 250)']     # Light sky blue for shallow parts
                    ],
                    reversescale=True,
                    showscale=True,
                    colorbar=dict(title="Depth (m)"),
                    name="River Bed",
                    lighting=dict(
                        ambient=0.7,
                        diffuse=0.9,
                        specular=0.3,
                        roughness=0.6
                    ),
                    hoverinfo='none'  # Disable hover info for the river bed surface
                ))
                
                # Create comprehensive ground surface that wraps around the river
                # This will include banks, sides, and bottom
                ground_resolution = 40  # Points for ground mesh
                
                # Create ground mesh that encompasses everything except the river channel
                for i in range(all_sites - 1):
                    # Get data for current and next section
                    curr_width = st.session_state.point_data[i]["width"]
                    next_width = st.session_state.point_data[i + 1]["width"]
                    curr_depths = np.array(st.session_state.point_data[i]["depths"])
                    next_depths = np.array(st.session_state.point_data[i + 1]["depths"])
                    max_depth_section = max(max(curr_depths), max(next_depths))
                    
                    # Left bank surface
                    left_x = []
                    left_y = []
                    left_z = []
                    
                    # Create left bank that wraps from top to bottom
                    for y_frac in [0, 0.5, 1]:
                        y_pos = i + y_frac
                        width_at_y = curr_width + (next_width - curr_width) * y_frac
                        
                        # Start from river edge (same as right bank)
                        left_x.append(0)
                        left_y.append(y_pos)
                        left_z.append(0)
                        
                        # Slope up to bank top
                        left_x.extend([-bank_extension/2, -bank_extension])
                        left_y.extend([y_pos, y_pos])
                        left_z.extend([bank_height * 0.7, bank_height])
                        
                        # Back down the far side
                        left_x.append(-bank_extension)
                        left_y.append(y_pos)
                        left_z.append(-max_depth_section * 1.2)
                        
                        # Bottom
                        left_x.append(-bank_extension/2)
                        left_y.append(y_pos)
                        left_z.append(-max_depth_section * 1.2)
                        
                        # Back to river edge at bottom
                        left_x.append(0)
                        left_y.append(y_pos)
                        left_z.append(-max_depth_section * 1.2)
                    
                    # Reshape for surface
                    n_points_per_profile = 6
                    n_profiles = 3
                    X_left = np.array(left_x).reshape(n_profiles, n_points_per_profile)
                    Y_left = np.array(left_y).reshape(n_profiles, n_points_per_profile)
                    Z_left = np.array(left_z).reshape(n_profiles, n_points_per_profile)
                    
                    fig.add_trace(go.Surface(
                        x=X_left,
                        y=Y_left,
                        z=Z_left,
                        colorscale=[[0, '#8B4513'], [0.3, '#A0522D'], [0.6, '#CD853F'], [1, '#DEB887']],
                        showscale=False,
                        name="Left Bank",
                        lighting=dict(ambient=0.8, diffuse=0.9, roughness=0.7, specular=0.2),
                        hoverinfo='none'  # Disable hover info for banks
                    ))
                    
                    # Right bank surface (similar but mirrored)
                    right_x = []
                    right_y = []
                    right_z = []
                    
                    for y_frac in [0, 0.5, 1]:
                        y_pos = i + y_frac
                        width_at_y = curr_width + (next_width - curr_width) * y_frac
                        
                        # Start from river edge
                        right_x.append(width_at_y)
                        right_y.append(y_pos)
                        right_z.append(0)
                        
                        # Slope up to bank top
                        right_x.extend([width_at_y + bank_extension/2, width_at_y + bank_extension])
                        right_y.extend([y_pos, y_pos])
                        right_z.extend([bank_height * 0.7, bank_height])
                        
                        # Back down the far side
                        right_x.append(width_at_y + bank_extension)
                        right_y.append(y_pos)
                        right_z.append(-max_depth_section * 1.2)
                        
                        # Bottom
                        right_x.append(width_at_y + bank_extension/2)
                        right_y.append(y_pos)
                        right_z.append(-max_depth_section * 1.2)
                        
                        # Back to river edge at bottom
                        right_x.append(width_at_y)
                        right_y.append(y_pos)
                        right_z.append(-max_depth_section * 1.2)
                    
                    X_right = np.array(right_x).reshape(n_profiles, n_points_per_profile)
                    Y_right = np.array(right_y).reshape(n_profiles, n_points_per_profile)
                    Z_right = np.array(right_z).reshape(n_profiles, n_points_per_profile)
                    
                    fig.add_trace(go.Surface(
                        x=X_right,
                        y=Y_right,
                        z=Z_right,
                        colorscale=[[0, '#8B4513'], [0.3, '#A0522D'], [0.6, '#CD853F'], [1, '#DEB887']],
                        showscale=False,
                        name="Right Bank",
                        lighting=dict(ambient=0.8, diffuse=0.9, roughness=0.7, specular=0.2),
                        hoverinfo='none'  # Disable hover info for banks
                    ))
                    
                    # Bottom surface connecting left and right banks under the river
                    bottom_x = []
                    bottom_y = []
                    bottom_z = []
                    
                    for y_frac in [0, 1]:
                        y_pos = i + y_frac
                        width_at_y = curr_width + (next_width - curr_width) * y_frac
                        
                        # Create arc under the river
                        n_bottom_points = 10
                        for j in range(n_bottom_points):
                            x_frac = j / (n_bottom_points - 1)
                            x_pos = x_frac * width_at_y
                            
                            bottom_x.append(x_pos)
                            bottom_y.append(y_pos)
                            bottom_z.append(-max_depth_section * 1.2)
                    
                    X_bottom = np.array(bottom_x).reshape(2, -1)
                    Y_bottom = np.array(bottom_y).reshape(2, -1)
                    Z_bottom = np.array(bottom_z).reshape(2, -1)
                    
                    fig.add_trace(go.Surface(
                        x=X_bottom,
                        y=Y_bottom,
                        z=Z_bottom,
                        colorscale=[[0, 'rgb(0, 0, 139)'], [1, 'rgb(65, 105, 225)']],  # Dark blue for river bottom
                        showscale=False,
                        name="River Bottom",
                        lighting=dict(ambient=0.7, diffuse=0.6, roughness=0.9),
                        hoverinfo='none'  # Disable hover info for river bottom
                    ))
                
                # Create water surface that follows actual river width at each site
                water_x_all = []
                water_y_all = []
                water_z_all = []
                
                for i in range(all_sites):
                    width = st.session_state.point_data[i]["width"]
                    # Create water surface only within actual river width
                    water_x = np.linspace(0, width, num_interp_points)
                    water_x_all.append(water_x)
                    water_y_all.append([i] * num_interp_points)
                    water_z_all.append([0] * num_interp_points)
                
                X_water = np.array(water_x_all)
                Y_water = np.array(water_y_all)
                Z_water = np.array(water_z_all)
                
                fig.add_trace(go.Surface(
                    x=X_water,
                    y=Y_water,
                    z=Z_water,
                    colorscale=[[0, 'rgba(173, 216, 230, 0.6)'], [1, 'rgba(135, 206, 250, 0.6)']],
                    showscale=False,
                    opacity=0.7,
                    name="Water Surface",
                    lighting=dict(ambient=0.8, diffuse=0.9, roughness=0.1, specular=0.6),
                    hoverinfo='none'  # Disable hover info for water surface
                ))
            
            # Add markers at each original measurement point within sites
            for i in range(all_sites):
                point_data = st.session_state.point_data[i]
                for j, (dist, depth) in enumerate(zip(point_data["distances"], point_data["depths"])):
                    site_name = point_data["point_name"]
                    fig.add_trace(go.Scatter3d(
                        x=[dist],
                        y=[i],
                        z=[-depth],
                        mode='markers+text',
                        marker=dict(
                            size=6,
                            color='red',
                            symbol='circle'
                        ),
                        text=[f"{depth:.1f}m"],
                        textposition="top center",
                        textfont=dict(size=8),
                        showlegend=False,
                        hovertemplate=f"Site {i+1} ({site_name})<br>Point {j+1}<br>Width: {point_data['width']}m<br>Depth: {depth:.1f}m<extra></extra>"
                    ))
            
            # Add site name labels
            for i in range(all_sites):
                point_name = st.session_state.point_data[i]["point_name"]
                fig.add_trace(go.Scatter3d(
                    x=[max_width + bank_extension + 0.5],
                    y=[i],
                    z=[bank_height/2],
                    mode='text',
                    text=[point_name],
                    textposition="middle right",
                    textfont=dict(size=14, color='black'),
                    showlegend=False,
                    hoverinfo='none'  # Disable hover info for labels
                ))
            
            # Update layout for better visualization
            fig.update_layout(
                title="3D River Profile - Natural Channel with Wrapped Banks",
                scene=dict(
                    xaxis_title="Width (m)",
                    yaxis_title="River Sections",
                    zaxis_title="Elevation (m)",
                    aspectratio=dict(x=1.5, y=2, z=0.5),
                    camera=dict(
                        eye=dict(x=2.0, y=-2.0, z=1.0),
                        center=dict(x=0.5, y=all_sites/2, z=-0.3)
                    ),
                    xaxis=dict(
                        range=[-bank_extension-0.5, max_width + bank_extension + 0.5],
                        showgrid=True,
                        gridcolor='lightgray'
                    ),
                    yaxis=dict(
                        showgrid=True,
                        gridcolor='lightgray'
                    ),
                    zaxis=dict(
                        range=[-max_depth_overall * 1.3, bank_height + 0.5],
                        showgrid=True,
                        gridcolor='lightgray'
                    ),
                ),
                width=900,
                height=700,
                margin=dict(l=0, r=0, b=0, t=40),
                showlegend=False,
                hovermode=False  # Completely disable default hover behavior
            )
            
            st.plotly_chart(fig)
            
            # Create individual cross-section charts
            st.subheader("All Cross-Sections")
            
            # Create a subplot grid
            rows = (st.session_state.num_points + 1) // 2  # Calculate number of rows needed
            fig = make_subplots(rows=rows, cols=2, 
                               subplot_titles=[st.session_state.point_data[i]["point_name"] for i in range(st.session_state.num_points)])
            
            for i in range(st.session_state.num_points):
                point_data = st.session_state.point_data[i]
                row = i // 2 + 1
                col = i % 2 + 1
                width = point_data["width"]
                
                # Left bank
                fig.add_trace(
                    go.Scatter(
                        x=[-0.5, 0],
                        y=[0.5, 0],
                        mode='lines',
                        fill='tozeroy',
                        line=dict(color='brown', width=0),
                        fillcolor='peru',
                        showlegend=False,
                        name='Left Bank'
                    ),
                    row=row, col=col
                )
                
                # Right bank
                fig.add_trace(
                    go.Scatter(
                        x=[width, width+0.5],
                        y=[0, 0.5],
                        mode='lines',
                        fill='tozeroy',
                        line=dict(color='brown', width=0),
                        fillcolor='peru',
                        showlegend=False,
                        name='Right Bank'
                    ),
                    row=row, col=col
                )
                
                # Riverbed
                fig.add_trace(
                    go.Scatter(
                        x=point_data["distances"],
                        y=[-d for d in point_data["depths"]],  # Convert to negative so it shows downward
                        mode="lines+markers",
                        fill="tozeroy",
                        name=point_data["point_name"],
                        showlegend=False,
                        line=dict(color='royalblue', width=2),
                        marker=dict(size=8, color='darkblue', symbol='circle')
                    ),
                    row=row, col=col
                )
                
                # Water surface
                fig.add_trace(
                    go.Scatter(
                        x=[0, point_data["width"]],
                        y=[0, 0],
                        mode="lines",
                        name="Water Surface",
                        showlegend=False,
                        line=dict(color='lightblue', width=2)
                    ),
                    row=row, col=col
                )
                
                # Add measurement point labels
                for j, (dist, depth) in enumerate(zip(point_data["distances"], point_data["depths"])):
                    fig.add_annotation(
                        x=dist,
                        y=-depth - 0.1,
                        text=f"{depth}m",
                        showarrow=False,
                        yshift=-10,
                        font=dict(size=8),
                        row=row, col=col
                    )
                
                # Add width indicator line above the river
                fig.add_shape(
                    type="line",
                    x0=0, y0=0.2,
                    x1=width, y1=0.2,
                    line=dict(color="black", width=2),
                    row=row, col=col
                )
                
                # Add small vertical lines at the ends of the width line
                fig.add_shape(
                    type="line",
                    x0=0, y0=0.2,
                    x1=0, y1=0.1,
                    line=dict(color="black", width=2),
                    row=row, col=col
                )
                
                fig.add_shape(
                    type="line",
                    x0=width, y0=0.2,
                    x1=width, y1=0.1,
                    line=dict(color="black", width=2),
                    row=row, col=col
                )
                
                # Add width label
                fig.add_annotation(
                    x=width/2,
                    y=0.3,
                    text=f"{width}m",
                    showarrow=False,
                    font=dict(size=8),
                    row=row, col=col
                )
                
                # Update axes for this subplot - use actual width plus some margin
                fig.update_xaxes(
                    title_text="Width (m)", 
                    range=[-0.5, width+0.5],  # Use actual width for this point, not max width
                    row=row, col=col
                )
                fig.update_yaxes(
                    title_text="Depth (m)", 
                    row=row, col=col
                )
                
                # Set background color to light blue to represent water
                fig.update_layout(
                    plot_bgcolor='lightcyan'
                )
            
            fig.update_layout(height=300*rows, width=800)
            st.plotly_chart(fig)
            
            # Data table view
            st.subheader("Measurement Data")
            
            # Prepare data for display in table format
            table_data = []
            for i in range(st.session_state.num_points):
                point_data = st.session_state.point_data[i]
                for j in range(len(point_data["distances"])):
                    table_data.append({
                        "Site Number": i+1,
                        "Site Name": point_data["point_name"],
                        "Point Number": j+1,
                        "Distance from Bank (m)": point_data["distances"][j],
                        "Depth (m)": point_data["depths"][j]
                    })
            
            if table_data:
                df = pd.DataFrame(table_data)
                st.dataframe(df)
                
                # Download button for the data
                csv = df.to_csv(index=False)
                st.download_button(
                    label="Download Data as CSV",
                    data=csv,
                    file_name="river_measurements.csv",
                    mime="text/csv",
                )
        else:
            st.info("Please enter measurement data for all points to see the visualization.")

st.sidebar.header("About")
st.sidebar.info("""
This app helps GCSE Geography students visualize river measurements for coursework.
1. Enter the number of points along the river where you took measurements
2. For each point, input the river width and depth measurements
3. View the 3D visualization and cross-sections
4. Download your data for your coursework
""")