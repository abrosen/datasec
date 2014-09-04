import string
corpus =  open("classcipher", "r").read()



def getFreqs(text):
    freqs = {}
    textSize = float(len(text))
    symbols = set(text)
    for symbol in symbols:
        freqs[symbol] =  text.count(symbol)/textSize
    return freqs


# generator for dimers trimers and polymers
def generatePolymer(text, symbolSize = 2):
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

#freqs by num of charactrers
#def phi2(freqs, text):



def unpermute(text, keyLength):
    columns = [[] for i in range(keyLength)]
    i = 0
    for letter in text:
        columns[i].append(letter)
        i = (i + 1) % keyLength
    return columns


def sanitize(text):
    exclude = set(string.punctuation)
    text = ''.join(ch for ch in text if ch not in exclude)
    text = text.lower()
    text = ''.join(text.split())
    return text

#text = list(createPolymer(corpus))
bestText  = ""
bestPhi = -2.0 # an arbitrary value
for i in range(2,200):
    cols  = unpermute(corpus,i)
    unscramb = ''.join(map(lambda x: "".join(x),  cols))
    currentPhi =  phi(getFreqs(list(generatePolymer(unscramb))),36)
    if bestPhi < currentPhi:
        bestPhi =  currentPhi
        bestText = unscramb
    #print unscramb, i, phi(getFreqs(list(generatePolymer(unscramb))),36)

print bestText, bestPhi
bestText = bestText.strip('\0')
comparisonText =  open("3boat10.txt").read()
comparisonText = sanitize(comparisonText)
corpusSize = len(bestText)
for i in range(0,len(comparisonText)):
    candidate = comparisonText[i:i+corpusSize]
    if bestPhi < phi(getFreqs(candidate), 26):
        print candidate

print comparisonText[7]
# I've implemented unpermute in the reverse, but valid way
# but I'm sick, so I'll fix that tomorrow.
# this gets the right unpermute at i = 115