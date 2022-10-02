# import matplotlib
# import matplotlib.pyplot as plt
import networkx as nx
# matplotlib.interactive(True)
from data import data

G = nx.Graph()
for x in data:
    for i in data[x]:
        G.add_edge(x, i)
print("Welcome to the 6 Degrees Python Suite")


def shortest():
    # Finds shortest connection path between a pair
    for j in nx.all_shortest_paths(G, source=input("Person A: "), target=input("Person B: ")):
        print(j)
        print(len(j))

def connections():
    # Identifies all connections for a given node
    person = input("Person: ")
    print(nx.edges(G, person))
    print(len(nx.edges(G, person)))


def sample_size(G):
    # Allows user to remove nodes to get data for different sets of nodes and edges
    deldata = input("Which people would you like to keep in the data? ").split(",")
    print(deldata)
    for x in G.copy():
        if not x in deldata:
            G.remove_node(x)
def data():
    # Gives an array of data on the graphing of the currently present dataset (modify with sample size)
    print(f"Edges: {nx.number_of_edges(G)}")
    print(f"Nodes: {nx.number_of_nodes(G)}")
    length = dict(nx.all_pairs_shortest_path_length(G))

    dictionary_length = {}
    for x in G:
        for i in G:

            if not length[x][i] in dictionary_length:
                dictionary_length[length[x][i]] = 1
            else:
                dictionary_length[length[x][i]] += 1
    for x in range(7):
        try:
            print(f"{x}: {dictionary_length[x] / 2}")
        except:
            print("N/A")
    tally = 0
    big_bench = 0
    small_bench = 99999
    for x in G:
        tally += nx.degree(G, x)
        if small_bench > nx.degree(G, x):
            small_bench = nx.degree(G, x)
        if big_bench < nx.degree(G, x):
            big_bench = nx.degree(G, x)
    tally /= len(G)
    print(f"Average number of edges per node: {tally}")
    print(f"Range of edges per node: {small_bench} - {big_bench}")
    length = dict(nx.all_pairs_shortest_path_length(G))
    iterator = 0
    total = 0
    for x in G:
        for i in G:
            iterator += 1
            total += length[x][i]
    print(f"Average: {total / iterator}")


while True:
    choice = input("Action: ")
    if choice == "shortest":
        # Finds shortest distance between two users and all possible links
        shortest()
    elif choice == "connections":
        connections()
    elif choice == "sample size":
        sample_size(G)
    elif choice == "data":
        data()