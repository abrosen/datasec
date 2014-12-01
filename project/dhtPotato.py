import random
import time
import latexTools
from bisect import bisect_left
from hashlib import sha1
import matplotlib.pyplot as plt




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
    malKeys = [getHash(mal+str(p)) for mal in malIPs for p in xrange(49152,65536)]
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
    print "Network Size:", networkSize,"Sybil IPs", numIPs, "Regions Injected :", success/networkSize, "avg Injections per region", injections/networkSize
    return numIPs, networkSize, success/networkSize, injections/networkSize


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

    malKeys = [getHash(mal+str(p)) for mal in malIPs for p in xrange(49152,65536)]
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
    #print "Network Size:", networkSize,"Sybil IPs", numIPs, "Eclipse percentage:", eclipses/(160*networkSize), "Coverage per Node:", sum(coverages)/networkSize
    return numIPs, networkSize , eclipses/(160*networkSize), sum(coverages)/networkSize




def doExperiment1():
    samples= [10000]
    for x in samples:
        testWide(x)


def doExperiment2():
    networkSizes = [50,100,200,300,400,500,1000,5000,10000,15000,20000,25000,50000,100000]#,1000000] 
    IPs = [1,3,5,10]#xrange(1,11)
    results = []
    results.append(("IPs","Network Size","% Regions covered", "Sybils/Region" ))
    for i in IPs:
        for n in networkSizes:
            results.append(testCollisions(n,i))
    return results


def doExperiment3():
    networkSizes = [50,100,150,200,250,300,400,500,1000,5000] 
    IPs = [1,3,5,10]#xrange(1,11)
    results = []
    results.append(("IPs","Network Size"," \% links occluded", "Occlusion per node" )) 
    for i in IPs:
        for n in networkSizes:
            results.append(testChordEclipse(n,i))
    return results



doExperiment1()
exp2 = doExperiment2()
print latexTools.makeTableFromData(exp2)
exp3 = doExperiment3()
print latexTools.makeTableFromData(exp3)




"""Linear scale of injections per region"""

"""make a chart node static x ip y prob
This can allow us to extrapolate effects of increasing num IPs
n = 20,000,000
x = num IPs
f(x) =  occlusion per node 
g(x) = percent occulusion

now change nodes but keep IP static
note the curve, extrapolate
"""

"""
N = 10000
print exp2
x2 = [x[0] for x in exp2[1:] if x[1]==N]
f2 = [x[3] for x in exp2[1:] if x[1]==N]
g2 = [x[2] for x in exp2[1:] if x[1]==N]

plt.plot(x2,f2, 'ko')
plt.show()

plt.plot(x2,g2,'ko')
plt.show()


I = 5
print exp2
x3 = [x[1] for x in exp2[1:] if x[0]==I]
f3 = [x[3] for x in exp2[1:] if x[0]==I]
g3 = [x[2] for x in exp2[1:] if x[0]==I]

plt.plot(x3,f3, 'ko')
plt.show()

plt.plot(x3,g3,'ko')
plt.show()"""