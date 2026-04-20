def generate_heavy_matrix():
    # Formula modeled on copilot-agent-architecture.json
    # Heavy Graph Base = 5 KB
    # Init Cost per Visual = 2 KB
    # Action Cost per Step = 0.5 KB * Visuals (Assuming action count scales with visuals)
    # Total Size (KB) = 5 + 2*V + 0.5*S*V
    
    steps_list = [10, 20, 40, 80]
    visuals_list = [5, 10, 20]
    
    print("--- HEAVY HLD EXTRAPOLATION (KB) ---")
    print("Steps \\ Visuals | 5 | 10 | 20")
    for s in steps_list:
        row = []
        for v in visuals_list:
            size = 5 + 2*v + 0.5 * s * v
            row.append(size)
        print(f"{s:2} | {row[0]:.2f} | {row[1]:.2f} | {row[2]:.2f}")

if __name__ == "__main__":
    generate_heavy_matrix()
