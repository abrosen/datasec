import string
#corpus =  open("classcipher", "r").read()



def getFreqs(text):
    freqs = {}
    textSize = float(len(text))
    symbols = set(text)
    for symbol in symbols:
        freqs[symbol] =  text.count(symbol)/textSize
    return freqs


def getNwiseFreqs(text,  n = 2):
    freqs = {}
    textSize = float(len(text))
    for i in range(0,len(text)- (n - 1)):
        symbol = text[i:i+n]
        if symbol not in freqs.keys():
            freqs[symbol] = text.count(symbol)/textSize
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

def phi2(freqs):
    average = sum(freqs.values())/len(freqs.keys())
    return sum(map(lambda x: freqs[x]*(freqs[x]- average), freqs.keys()))


def psi(freqs):
    return sum(map(lambda x: freqs[x]**2, freqs))


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

if __name__ == '__main__':
    c1 =  open("c1", "r").read()
    c1  = sanitize(c1)
    c2 =  open("c12", "r").read()
    c2  = sanitize(c2)
    c3 =  open("c13", "r").read()
    c3  = sanitize(c3)

    for c in [c1,c2,c3]:
        print phi2(getFreqs(c)), phi2(getNwiseFreqs(c,3),), psi(getFreqs(c)), psi(getNwiseFreqs(c)) 


    corpus =  open("classcipher", "r").read()
    print "Corpus phis", phi2(getFreqs(corpus)), phi(getFreqs(list(generatePolymer(corpus))), 36)

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

    print bestPhi, bestText
    bestText = bestText.strip('\0')
    bestText = list(generatePolymer(bestText)) 

    corpusSize = len(bestText)

    numGG = 10
    keys = []
    ggIndex = 0
    for i in range(0, numGG):
        key =  bestText.index('gg', ggIndex +1)
        keys.append(key)
        ggIndex = key
    print keys


    comparisonText =  open("3boat10.txt").read()
    comparisonText = sanitize(comparisonText)


    for i in range(0, len(comparisonText) - corpusSize):
        targets = []
        for k in keys:
            targets.append(comparisonText[i+k])
        #print targets
        if len(set(targets))==1:
            print comparisonText[i:i+corpusSize]

