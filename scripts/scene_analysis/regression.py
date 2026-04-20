import json
import os
import glob
from pathlib import Path

def analyze_scenes():
    script_dir = Path(__file__).parent
    scenes_dir = script_dir.parent.parent / "apps" / "web" / "src" / "content" / "scenes"
    files = list(scenes_dir.rglob("*.json"))
    
    data = []
    
    for f in files:
        try:
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
                size = len(content)
                parsed = json.loads(content)
                steps = len(parsed.get('steps', []))
                visuals = len(parsed.get('visuals', []))
                data.append((steps, visuals, size))
        except Exception as e:
            pass
            
    # Simple Multiple Linear Regression using minimal dependencies:
    # y = b0 + b1*x1 + b2*x2 => X * B = Y => B = (X^T X)^-1 X^T Y
    # We will do gradient descent or just simply use normal equations manually.
    
    # We need to invert a 3x3 matrix.
    # Actually let's just make it a simple 2 variable without base: y = m1*x1 + m2*x2 
    # to avoid matrix inversion, or just manually invert 3x3.
    
    # Let's write manual 3x3 inversion
    def invert_3x3(m):
        det = m[0][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]) - \
              m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + \
              m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
              
        inv = [
            [(m[1][1] * m[2][2] - m[2][1] * m[1][2]) / det,
             (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det,
             (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det],
             
            [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det,
             (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det,
             (m[1][0] * m[0][2] - m[0][0] * m[1][2]) / det],
             
            [(m[1][0] * m[2][1] - m[2][0] * m[1][1]) / det,
             (m[2][0] * m[0][1] - m[0][0] * m[2][1]) / det,
             (m[0][0] * m[1][1] - m[1][0] * m[0][1]) / det]
        ]
        return inv

    # X: [1, steps, visuals]
    # Y: [size]
    
    # X^T X
    xtx = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]]
    xty = [0.0, 0.0, 0.0]
    
    for x1, x2, y in data:
        row = [1, x1, x2]
        for i in range(3):
            xty[i] += row[i] * y
            for j in range(3):
                xtx[i][j] += row[i] * row[j]
                
    xtx_inv = invert_3x3(xtx)
    
    # B = xtx_inv * xty
    B = [0.0, 0.0, 0.0]
    for i in range(3):
        for j in range(3):
            B[i] += xtx_inv[i][j] * xty[j]
            
    base = B[0]
    w_steps = B[1]
    w_visuals = B[2]
    
    print(f"Regression Coefficients: Base={base:.2f}, Steps={w_steps:.2f}, Visuals={w_visuals:.2f}")
    
    # Extrapolations:
    extrapolations = []
    for step_count in [10, 20, 40, 80]:
        row = []
        for visual_count in [5, 10, 20]:
            estimated_size = base + w_steps * step_count + w_visuals * visual_count
            row.append(estimated_size / 1024) # to KB
        extrapolations.append(row)
        
    print("--- Extrapolations (KB) ---")
    print("Steps \\ Visuals | 5 | 10 | 20")
    for i, s in enumerate([10, 20, 40, 80]):
        print(f"{s:2} | {extrapolations[i][0]:.2f} | {extrapolations[i][1]:.2f} | {extrapolations[i][2]:.2f}")

if __name__ == "__main__":
    analyze_scenes()
