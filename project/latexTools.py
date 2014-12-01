def makeTableFromData(rows):
    """
    rows is a list of tuples
    expected output is a string of the form
    \hline
    """
    output = "\\hline \n"
    for row in rows:
        for item in row:
            output  = output + str(item) + " & "
        output = output[:-2] + "\\\\ \hline\n"
    return output

if __name__ == '__main__':
    a = [("a", "b","c","d"),  ("123", "456","789","00123")] 
    print makeTableFromData(a)