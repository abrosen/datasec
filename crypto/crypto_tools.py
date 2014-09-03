corpus =  open("classcipher", "r").read()

def getFreqs(text):
    freqs = {}
    textSize = float(len(text))
    symbols = set(text)
    for symbol in symbols:
        freqs[symbol] =  text.count(symbol)/textSize
    return freqs


# generator for dimers trimers and polymers
def createPolymer(text, symbolSize = 2):
    symbols= ""
    textSize =  len(text)
    while textSize >= symbolSize:
        symbols  = symbols + text[0:symbolSize]
        text = text[symbolSize:]
        textSize = textSize - symbolSize
        yield symbols
        symbols = ""
    yield text


#num chars is expected num of chars in alphabet
def phi(freqs, numChars = 26):
    return sum(map(lambda x: freqs[x]*(freqs[x]- 1.0/numChars), freqs.keys()))


def unpermute(text, keyLength):
    columns = [[] for i in range(keyLength)]
    i = 0
    for letter in text:
        columns[i].append(letter)
        i = (i + 1) % keyLength
    return columns


def sanitize(text):
    return text.strip()

#text = list(createPolymer(corpus))
for i in range(2,200):
    cols  = unpermute(corpus,i)
    #print cols
    x  = ""
    unscramb = ''.join(map(lambda x: "".join(x),  cols))
    print unscramb, i, phi(getFreqs(list(createPolymer(unscramb))),36)

# I've implemented unpermute in the reverse, but valid way
# but I'm sick, so I'll fix that tomorrow.
# this gets the right unpermute at i = 115