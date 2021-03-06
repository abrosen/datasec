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

def testSingleRegion(networkSize):
    victims =  [getHash(generateRandomIP()+generateRandomPort()) for _ in xrange(networkSize)]
    victims = sorted(victims)
    success = 0.0
    times = []
    samples = 100
    mal = generateRandomIP()
    for i in xrange(samples):
        index = random.randint(0,networkSize-2)
        n = victims[index]
        m =  victims[index+1]
        start = time.time() 
        for j in xrange(49152,65535):
            port = str(j)
            attempt = getHash(mal+port)
            if hashBetween(attempt,n,m):
                success += 1
                break
        times.append(time.time() - start)
    print "Size", networkSize, "Successes:", success/samples, "Avg time:", sum(times)/samples
    return networkSize, success/samples, sum(times)/samples





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
    print "Network Size:", networkSize,"Sybil IPs", numIPs, "Eclipse percentage:", eclipses/(160*networkSize), "Coverage per Node:", sum(coverages)/networkSize
    return numIPs, networkSize , eclipses/(160*networkSize), sum(coverages)/networkSize





def probGivenKeysAndSize(numIPs,size, ports = 16383.0):
    T =  numIPs * ports
    return T/(T+size-1)


def numIPsGivenProbAndSize(p,size, ports =16383.0):
    return p*((size-1)/(1-p))/ports




def doExperiment0():
    samples= [10000]
    for x in samples:
        testWide(x)

def doExperiment1():
    networkSizes = [50,100,300,400,500,600,700,800,900,1000,2000,3000,4000,5000,10000,15000,20000,25000,50000,75000,100000,500000,1000000,5000000,10000000,20000000]
    results = []
    results.append(("Network Size","Success Rate","Avg Time to Mash a Region" ))
    for x in networkSizes:
        results.append(testSingleRegion(x))
    return results

def doExperiment2():
    networkSizes = [50,100,300,400,500,600,700,800,900,1000,2000,3000,4000,5000,10000,15000,20000,25000,50000,75000,100000,500000,1000000,5000000,10000000,20000000]
    IPs = xrange(1,21,2)
    results = []
    results.append(("IPs","Network Size","% Regions covered", "Sybils/Region" ))
    for i in IPs:
        for n in networkSizes:
            results.append(testCollisions(n,i))
    return results


def doExperiment3():
    networkSizes = [500,1000,5000,10000,50000,100000]
    IPs = xrange(1,11,2)
    results = []
    results.append(("IPs","Network Size"," \% links occluded", "Occlusion per node" )) 
    for i in IPs:
        for n in networkSizes:
            results.append(testChordEclipse(n,i))
    return results


def graph1FromStored(filename):
    f = open(filename, 'r')
    tmp= []
    data = []
    for line in f:
        tmp.append(line)
    tmp = tmp[1:]
    for line in tmp:
        line  = line.split(',')
        line =  line[:-1]
        line =  map(float, line)
        data.append(line)
    for i in range(len(data)):
        data[i][2] = int(data[i][2]*100000000)/100000.0 
    print latexTools.makeTableFromData(data)
    

    #graphExp1(data)


def graph2FromStored(filename):
    f = open(filename, 'r')
    tmp= []
    data = []
    for line in f:
        tmp.append(line)
    tmp = tmp[1:]
    for line in tmp:
        line  = line.split(',')
        line =  line[:-1]
        line =  map(float, line)
        print line
        data.append(line)
    #print latexTools.makeTableFromData(data)
    graphExp2(data)
    

def graph3FromStored(filename):
    f = open(filename, 'r')
    tmp= []
    data = []
    for line in f:
        tmp.append(line)
    tmp = tmp[1:]
    for line in tmp:
        line  = line.split(',')
        line =  line[:-1]
        line =  map(float, line)
        print line
        data.append(line)
    graphExp3(data)


def graphExp1(data):
    sizes =  [x[0] for x in data]
    times =  [x[2] for x in data]
    plt.plot(sizes,times, '--k')
    plt.semilogx(sizes,times, 'ok')
    plt.grid(True)
    plt.title("Time Needed to Mash a Pair of Adjacent Nodes")
    plt.xlabel('Network Size')
    plt.ylabel('Time (milliseconds)')
    plt.show()





def graphExp2(data):
    """
    row[0] =  IPs
    row[1] = size 
    row[2] = success rate
    row[3] =  avg sybils per region
    """
    d = {}
    for row in data:
        if row[1] not in d.keys():
            d[row[1]] = ([],[])
        d[row[1]][0].append(row[0])
        d[row[1]][1].append(row[2])
    
    #for k in sorted(d.keys()):
        #[50,500,600,700,800,900,1000,2000,3000,4000,5000,10000,15000,20000,25000,50000,75000,100000,500000,1000000,5000000,10000000,20000000]:
    #    if k in [100,1000,10000,100000,1000000,10000000,20000000]:
    #        plt.semilogy(d[k][0],d[k][1], 'o', label= str(int(k)) + " Nodes")
    #        plt.plot(d[k][0], map(probGivenKeysAndSize, d[k][0] , [k]*len(d[k][0]) )  ,'--k')
    for k,sty in zip([1000,10000,100000,1000000,10000000,20000000], [ 'ok','vk','dk','sk','^k','xk']):
        plt.semilogy(d[k][0],d[k][1], sty, label= str(int(k)) + " Nodes")
        plt.plot(d[k][0], map(probGivenKeysAndSize, d[k][0] , [k]*len(d[k][0]) )  ,'--k')
    plt.grid(True)
    plt.title("Sybil vs Probability")
    plt.xlabel('Number of Sybil IPs')
    plt.ylabel('Probability')
    plt.legend(loc=4)
    plt.show()
    

    
    d = {}
    for row in data:
        if row[0] not in d.keys():
            d[row[0]] = ([],[])
        d[row[0]][0].append(row[1])
        d[row[0]][1].append(row[2])
    #for k in sorted(d.keys()):
    #    if k in [1,5,9,13,19]:
    #        plt.semilogx(d[k][0],d[k][1], 'o', label= str(int(k)) + " IPs")
    #        plt.plot(d[k][0], map(probGivenKeysAndSize, [k]*len(d[k][0]),  d[k][0])  ,'--k')
    for k,sty in zip([1,5,9,13,19], [ 'ok','vk','dk','sk','^k']):
        plt.loglog(d[k][0],d[k][1], sty, label= str(int(k)) + " IPs")
        plt.plot(d[k][0], map(probGivenKeysAndSize, [k]*len(d[k][0]),  d[k][0])  ,'--k')
    plt.grid(True)
    plt.xlabel('Number of Healthy Nodes')
    plt.ylabel('Probability')
    plt.title('Network Size vs Probability')
    plt.legend(loc=3)
    plt.show()
    
    """
    d = {}
    for row in data:
        if row[0] not in d.keys():
            d[row[0]] = ([],[])
        d[row[0]][0].append(row[1])
        d[row[0]][1].append(row[2])
    for k in sorted(d.keys()):
        if k in [1,5,9,13,19]:
            plt.loglog(d[k][0],d[k][1], 'o', label= str(int(k)) + " IPs")
            plt.plot(d[k][0], map(probGivenKeysAndSize, [k]*len(d[k][0]),  d[k][0])  ,'--k')
    plt.grid(True)
    plt.xlabel('Number of Healthy Nodes')
    plt.ylabel('Probability')
    plt.title('Network Size vs Probability')
    plt.legend(loc=3)
    plt.show()
    """
    
    """
    ips = []
    sizes = []
    for row in data:
        if row[2] <.600 and row[2] > .400:
            ips.append(row[0])
            sizes.append(row[1])
    print ips,sizes
    plt.loglog(sizes,ips,'o')
    plt.grid(True)
    plt.xlabel('Sizes')
    plt.ylabel('IPs')
    plt.title('LD-50')
    plt.show()
    """



def graphExp3(data):
    d = {}
    for row in data:
        if row[0] not in d.keys():
            d[row[0]] = ([],[])
        d[row[0]][0].append(row[1])
        d[row[0]][1].append(row[2])
    #for k in sorted(d.keys()):
    #   plt.semilogx(d[k][0],d[k][1], 'o', label= "Using %d IPs" % k)
    #   plt.plot(d[k][0], map(probGivenKeysAndSize, [k]*len(d[k][0]),  d[k][0])  ,'--k')
    for k,sty in zip(range(1,10,2),[ 'ok','vk','dk','sk','^k']):
        plt.semilogx(d[k][0],d[k][1], sty, label= "Using %d IPs" % k)
        plt.plot(d[k][0], map(probGivenKeysAndSize, [k]*len(d[k][0]),  d[k][0])  ,'--k')
    plt.grid(True)
    plt.xlabel('Number of Healthy Nodes')
    plt.ylabel('Probability')
    plt.title('Network Size vs Probability')
    plt.legend(loc=0)
    plt.show()


if __name__ == '__main__':
    print numIPsGivenProbAndSize(0.5,20000000)
    """
    tag = str(int(time.time()))
    exp1 = doExperiment1()
    f = open("exp1-" +tag+".txt", 'w')
    print latexTools.makeTableFromData(exp1)
    for line in exp1:
        for thing in line:
            f.write(str(thing)+", ")
        f.write("\n")
    
    
    tag = str(int(time.time()))

    exp2 = doExperiment2()
    print latexTools.makeTableFromData(exp2)
    for line in exp2:
        for thing in line:
            f.write(str(thing)+", ")
        f.write("\n")
    
    
    tag = str(int(time.time()))
    f = open("exp3-" +tag+".txt", 'w')
    exp3 = doExperiment3()
    for line in exp3:
        for thing in line:
            f.write(str(thing)+", ")
        f.write("\n")
    print latexTools.makeTableFromData(exp3)
    """
    #graph1FromStored("exp1-1418152690.txt")
    #graph2FromStored("exp2-1417708567.txt")
    graph3FromStored("exp3-1417983976.txt")



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
