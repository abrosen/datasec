import random
import time
from bisect import bisect_left
from hashlib import sha1
random.seed(12345)
print "Experiment Parameter 1: The keysize in bits is", sha1().digest_size * 8
M = 160


class ChordNode(object):
    """docstring for ChordNode"""
    def __init__(self, key):
        super(ChordNode, self).__init__()
        self.key = key
        self.fingers = [0]*M
        for i in xrange(0,M):
            self.fingers[i] = (self.key + 2**i) % (2**M) 




def getHash(value):
    return long(sha1(value).hexdigest(),16)

def hashBetween(target, left, right):
    if left ==  right:
        return True
    if target == left or target == right:
        return False
    #print target, "<", right, "and", target, ">", left, target < right and target > left
    if target < right and target > left:
        return True
    #print left, ">", right, left > right 
    if left > right :
        #print left, ">", target, "and", target, "<", right, left > target and target < right
        if left > target and target < right:
            return True
        #print left, "<", target, "and", target, ">", right, left < target and target > right
        if left < target and target > right:
            return True
    return False


def generateRandomIP():
    return "".join(map(str, (random.randint(0,255) for _ in range(4))))

def generateRandomPort():
    return str(random.randint(0,65535))




def testWide(trials):
    mal = generateRandomIP()
    success = 0.0
    times = []
    for _ in xrange(trials):
        start = time.time() 
        n = getHash(generateRandomIP())
        m = getHash(generateRandomIP())
        for j in xrange(49152,65535):
            port = str(j)
            attempt = getHash(mal+port)
            if hashBetween(attempt,n,m):
                success += 1
                break
        times.append(time.time() - start)
    print "Successes:", success/trials,"Avg time:", sum(times)/trials 



def testCollisions(networkSize, numIPs=1):
    malIPs = []
    for i in xrange(numIPs):
        malIPs.append(generateRandomIP())


    victims =  [getHash(generateRandomIP()+generateRandomPort()) for _ in xrange(networkSize)]
    victims = sorted(victims)
    success = 0.0
    injections = 0.0
    #mal = generateRandomIP()
    malKeys = [getHash(mal+str(p)) for mal in malIPs for p in xrange(49152,65535)]
    malKeys = sorted(malKeys)

    """
    Let's make this an O(n) operation
    """
    malIndex = 0
    for i in xrange(networkSize - 1):
        a = victims[i]
        b = victims[i+1]
        injected = False
        while   malIndex < len(malKeys) and malKeys[malIndex] < b:
            attempt = malKeys[malIndex]
            if hashBetween(attempt,a,b):
                injected  = True
                injections += 1
            malIndex +=1
        if injected:
            success += 1
    malIndex = 0
    a = victims[-1]
    b = victims[0]
    injected = False
    while  malIndex < len(malKeys) and malKeys[malIndex] < b:
        attempt = malKeys[malIndex]
        if hashBetween(attempt,a,b):
            injected  = True
            injections += 1
        malIndex +=1
    if injected:
        success += 1
    print "Network Size:", networkSize, "Regions Injected :", success/networkSize, "avg Injections per region", injections/networkSize

        

def testChordEclipse(networkSize, numIPs = 1):  
    """
    0 -> healthy
    1 -> Sybil 
    """
    malIPs = []
    for i in xrange(numIPs):
        malIPs.append(generateRandomIP())
    victims =  [getHash(generateRandomIP()+generateRandomPort()) for _ in xrange(networkSize)]
    victims = sorted(victims)

    malKeys = [getHash(mal+str(p)) for mal in malIPs for p in xrange(49152,65535)]
    malKeys = sorted(malKeys)
    
    networkTable = {}
    for v in victims:
        networkTable[v] = 0
    for m in malKeys:
        networkTable[m] = 1
    network = sorted(networkTable.keys())

    eclipses = 0.0
    coverages= []
    """learning to use bisect version"""
    for v in victims:
        coverage = 0.0
        n = ChordNode(v)
        for f in n.fingers:
            index = bisect_left(network,f,lo=0, hi=len(network))  ## check this with simple case
            if index>= len(network):
                index = 0
            if networkTable[network[index]] == 1:
                eclipses +=1
                coverage +=1
        coverages.append(coverage)
    print "Eclipse percentage:", eclipses/(160*networkSize), "Coverage per Node:", sum(coverages)/networkSize


#testWide(100000)
#testCollisions(100000,10)
#testChordEclipse(20000,1)
#print "Network Size:", trials, "Successes:", success/trialstestSuccessors(1000)
"""Linear scale of injections per region"""
#testSuccessors(20000)
